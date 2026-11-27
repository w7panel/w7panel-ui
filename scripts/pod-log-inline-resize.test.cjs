const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Vue = require('vue');

const filename = path.resolve(__dirname, '../src/components/pod-log.vue');
const source = fs.readFileSync(filename, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

async function settle() {
    await Vue.nextTick();
    await new Promise(resolve => setImmediate(resolve));
    await Vue.nextTick();
}

async function harness({ mode = 'inline', resizeObserver = true, hidden = false } = {}) {
    const frames = new Map(), listeners = new Set(), observers = [], terminals = [], requests = [];
    let frameId = 0;
    const windowMock = {
        requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        addEventListener(name, callback) { if (name === 'resize') listeners.add(callback); },
        removeEventListener(name, callback) { if (name === 'resize') listeners.delete(callback); },
    };
    class ResizeObserverMock {
        constructor(callback) { this.callback = callback; this.active = true; observers.push(this); }
        observe(element) { this.element = element; }
        disconnect() { this.active = false; }
    }
    class Terminal {
        constructor() { this.disposed = 0; this.resets = 0; terminals.push(this); }
        open(element) { this.element = element; }
        loadAddon(addon) { this.addon = addon; addon.element = this.element; }
        reset() { this.resets++; }
        dispose() { this.disposed++; }
        write() {}
    }
    class FitAddon {
        constructor() { this.fits = 0; }
        fit() {
            assert(this.element.clientWidth > 0 && this.element.clientHeight > 0, 'hidden geometry must not be fitted');
            this.fits++;
            this.columns = Math.floor(this.element.clientWidth / 10);
        }
    }
    const dom = { clientWidth: hidden ? 0 : 600, clientHeight: hidden ? 0 : 300 };
    const exports = {};
    vm.runInNewContext(code, {
        exports, window: windowMock, document: { getElementById: () => dom },
        AbortController, URLSearchParams, TextDecoder,
        ...(resizeObserver ? { ResizeObserver: ResizeObserverMock } : {}),
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) } };
        },
        require(name) {
            if (name === '@/utils/api') return { k8sproxy: { get() { throw new Error('Unexpected Kubernetes request'); } } };
            if (name === '@xterm/xterm') return { Terminal };
            if (name === '@xterm/addon-fit') return { FitAddon };
            if (name === '@xterm/xterm/css/xterm.css') return {};
            if (name === '@/utils/auth') return { getToken: () => 'test-token' };
            if (name === '@/store') return { useNamespaceStore: () => ({ namespace: 'tenant' }) };
            throw new Error(`Unexpected import ${name}`);
        },
    }, { filename });
    const component = exports.default;
    component.render = function () { return Vue.h('div', { ref: 'terminal' }); };
    // Use the production script, watchers and lifecycle; only the terminal DOM,
    // Arco controls, xterm and the network are outside this component regression.
    let child;
    component.mounted = function () { child = this; };
    const show = Vue.ref(false), height = Vue.ref(500);
    const renderer = Vue.createRenderer({
        createElement: () => dom, createText: () => ({}), createComment: () => ({}),
        setText() {}, setElementText() {}, parentNode() {}, nextSibling() {}, insert() {}, remove() {}, patchProp() {},
    });
    const app = renderer.createApp({ render() {
        return Vue.h(component, { show: show.value, height: height.value, mode,
            namespace: 'tenant', podName: 'site-pod', container: 'web', containers: ['web', 'worker'] });
    } });
    app.mount({});
    show.value = true;
    await settle();
    const flushFrames = () => {
        for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
    };
    flushFrames();
    return { app, child, dom, show, height, frames, listeners, observers, terminals, requests, flushFrames,
        emitWindowResize() { for (const listener of listeners) listener(); },
        emitObserverResize() { for (const observer of observers) if (observer.active) observer.callback(); },
    };
}

test('inline height and width changes fit the existing terminal without restarting logs or resetting controls', async t => {
    const state = await harness();
    t.after(() => state.app.unmount());
    const terminal = state.terminals[0], initialFits = terminal.addon.fits;
    assert.equal(initialFits, 1);
    state.child.currentContainer = 'worker';
    state.child.follow = false;
    state.child.currentTailLines = 1000;
    const requestId = state.child.logRequestId, controller = state.child.controller, resets = terminal.resets;
    state.dom.clientWidth = 920; state.dom.clientHeight = 600;
    state.height.value = 800;
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits + 1);
    assert.equal(terminal.addon.columns, 92);
    assert.equal(state.observers.length, 1);
    assert.equal(state.observers[0].element, state.dom);
    state.dom.clientWidth = 760;
    state.emitObserverResize(); state.emitWindowResize();
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits + 2, 'resize notifications coalesce into one animation frame');
    assert.equal(state.terminals.length, 1);
    assert.equal(state.requests.length, 1);
    assert.equal(state.child.logRequestId, requestId);
    assert.equal(state.child.controller, controller);
    assert.equal(terminal.resets, resets);
    assert.equal(state.child.currentContainer, 'worker');
    assert.equal(state.child.follow, false);
    assert.equal(state.child.currentTailLines, 1000);
});

test('inline fitting waits until the terminal ref has visible dimensions', async t => {
    const state = await harness({ hidden: true });
    t.after(() => state.app.unmount());
    const terminal = state.terminals[0];
    assert.equal(terminal.addon.fits, 0);
    state.dom.clientWidth = 600; state.dom.clientHeight = 300;
    state.emitObserverResize();
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, 1);
    assert.equal(state.requests.length, 1);
});

test('unmount cancels queued fits, disconnects observers and removes window listeners', async () => {
    const state = await harness();
    const terminal = state.terminals[0], initialFits = terminal.addon.fits;
    state.emitObserverResize(); await settle();
    assert.equal(state.frames.size, 1);
    state.app.unmount();
    assert.equal(state.frames.size, 0);
    assert.equal(state.listeners.size, 0);
    assert(state.observers.every(observer => !observer.active));
    state.emitWindowResize(); state.emitObserverResize();
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits);
    assert.equal(terminal.disposed, 1);
});

test('window resizing remains available when ResizeObserver is unsupported', async t => {
    const state = await harness({ resizeObserver: false });
    t.after(() => state.app.unmount());
    const terminal = state.terminals[0], initialFits = terminal.addon.fits;
    state.dom.clientWidth = 800;
    state.emitWindowResize(); await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits + 1);
});

test('modal refits after opening, fullscreen changes, and container width changes', async t => {
    const state = await harness({ mode: 'modal' });
    t.after(() => state.app.unmount());
    const terminal = state.terminals[0], initialFits = terminal.addon.fits;
    assert.equal(initialFits, 1);
    state.child.onOpen();
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits + 1);
    state.child.toggleFullscreen(); await settle();
    state.flushFrames();
    assert.equal(terminal.addon.fits, initialFits + 2);
    state.dom.clientWidth = 520;
    state.emitObserverResize();
    await settle(); state.flushFrames();
    assert.equal(terminal.addon.columns, 52);
    assert.equal(state.observers.length, 1);
    assert.equal(state.listeners.size, 1);
    assert.equal(state.requests.length, 1);
});
