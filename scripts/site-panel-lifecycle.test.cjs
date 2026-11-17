const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Vue = require('vue');
const { compile } = require('@vue/compiler-dom');
const { parse } = require('@vue/compiler-sfc');
const root = path.resolve(__dirname, '..');

function load(relative, dependencies = {}) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const script = relative.endsWith('.vue') ? parse(source).descriptor.script.content : source;
    const exports = {};
    vm.runInNewContext(ts.transpileModule(script, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText, {
        exports, URL, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval,
        WebSocket: { OPEN: 1 }, document: { getElementById: () => null },
        window: { addEventListener() {}, removeEventListener() {}, requestAnimationFrame: setImmediate, cancelAnimationFrame: clearImmediate },
        require: name => dependencies[name] || {},
    }, { filename: relative });
    return { exports, source };
}
const helpers = load('src/utils/site-panel.ts').exports;
const tick = async () => {
    for (let i = 0; i < 3; i++) { await new Promise(resolve => setImmediate(resolve)); await Vue.nextTick(); }
};
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const pod = (name = 'site-pod', uid = name, id = 'container-1') => ({
    metadata: { name, uid }, spec: { containers: [{ name: 'web' }, { name: 'sidecar' }] },
    status: { phase: 'Running', containerStatuses: [
        { name: 'web', containerID: id, state: { running: {} } },
        { name: 'sidecar', containerID: 'sidecar-1', state: { running: {} } },
    ] },
});

function mountPanel(view) {
    const state = { pods: [pod()], requests: [], blocked: null, exits: [], closes: 0, streams: 0, aborts: 0 };
    const api = { async get(url) {
        state.requests.push(url);
        if (url.includes('/appgroups/')) return { data: { status: { items: [{ kind: 'Deployment', name: url.split('/').pop() }] } } };
        if (url.includes('/deployments/')) return { data: { spec: { selector: { matchLabels: { app: 'site' } }, template: { spec: { containers: [{ name: 'web' }, { name: 'sidecar' }] } } } } };
        if (url.endsWith('/pods')) {
            const block = state.blocked;
            if (block) return block.promise;
            return { data: { items: state.pods } };
        }
        throw new Error(url);
    } };
    const shell = load('src/components/web-shell.vue').exports.default;
    shell.created = function () { this.socket = { readyState: 1, send: value => state.exits.push(value), close: () => state.closes++ }; };
    shell.render = () => Vue.h('div');
    const log = load('src/components/pod-log.vue', {
        '@xterm/xterm': { Terminal: class { open() {} loadAddon() {} dispose() {} reset() {} } },
        '@xterm/addon-fit': { FitAddon: class { fit() {} } },
        '@/utils/api': { k8sproxy: { async get() { state.streams++; return { data: 'log text' }; } } },
    }).exports.default;
    // Keep production initialization, DOM-ref timing, and teardown; mock the transport and xterm backend.
    log.methods.streamLog = function () { state.streams++; this.controller = { abort: () => state.aborts++ }; };
    log.render = () => Vue.h('div', { ref: 'terminal' });
    const loaded = load('src/views/app/pages/site-panel.vue', {
        '@/utils/site-panel': helpers, '@/utils/api': { k8sproxy: api },
        '@/components/web-shell.vue': { default: shell }, '@/components/pod-log.vue': { default: log },
    });
    const component = loaded.exports.default;
    component.mounted = () => {};
    component.render = new Function('Vue', compile(parse(loaded.source).descriptor.template.content, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
    const node = () => ({ children: [], parent: null, clientWidth: 800, clientHeight: 400 });
    const renderer = Vue.createRenderer({
        createElement: node, createText: node, createComment: node, setText() {}, setElementText() {}, patchProp() {},
        insert(child, parent, anchor) { if (child.parent) child.parent.children = child.parent.children.filter(n => n !== child); child.parent = parent; const at = anchor ? parent.children.indexOf(anchor) : -1; if (at >= 0) parent.children.splice(at, 0, child); else parent.children.push(child); },
        remove(child) { if (child?.parent) child.parent.children = child.parent.children.filter(n => n !== child); },
        parentNode: child => child.parent,
        nextSibling(child) { return child?.parent?.children[child.parent.children.indexOf(child) + 1] || null; },
    });
    const app = renderer.createApp(component);
    const route = Vue.reactive({ params: { group: 'site', view }, query: { namespace: 'tenant' }, fullPath: `/site/${view}` });
    app.config.warnHandler = () => {};
    app.config.globalProperties.$route = route;
    for (const name of ['a-alert', 'a-button', 'a-spin', 'a-select', 'a-option', 'a-empty']) app.component(name, { render() { return Vue.h('div', this.$slots.default?.()); } });
    const ctx = app.mount(node());
    function child(name, instance = app._instance) {
        if (instance.type.name === name) return instance.proxy;
        function walk(vnode) {
            if (!vnode) return;
            if (vnode.component) { const found = child(name, vnode.component); if (found) return found; }
            if (Array.isArray(vnode.children)) for (const n of vnode.children) { const found = walk(n); if (found) return found; }
        }
        return walk(instance.subTree);
    }
    return { state, ctx, route, app, child };
}

test('refreshing the same terminal target preserves its socket while pending, successful, or failed', async t => {
    const h = mountPanel('terminal'); t.after(() => h.app.unmount()); await tick();
    assert.equal(h.ctx.container, 'web');
    const block = h.state.blocked = deferred();
    const refresh = h.ctx.load(); await tick();
    assert.equal(h.state.closes, 0, 'the real WebShell teardown must not run while a list refresh is pending');
    assert.deepEqual(h.state.exits, []);
    block.resolve({ data: { items: [pod()] } }); await refresh; await tick();
    assert.equal(h.state.closes, 0);
    const failed = h.state.blocked = deferred(); const failure = h.ctx.load(); await tick();
    failed.reject(new Error('temporary network failure')); await failure; await tick();
    assert.match(h.ctx.error, /network/);
    assert.equal(h.state.closes, 0, 'a failed refresh keeps the last usable terminal');
});

test('refreshing logs retains the selected container, follow mode, tail count, and stream', async t => {
    const h = mountPanel('logs'); t.after(() => h.app.unmount()); await tick();
    const log = h.child('PodLog'); assert(log);
    assert(log.term, 'the real terminal initialization waits until its DOM ref exists');
    log.currentContainer = 'sidecar'; log.follow = false; log.currentTailLines = 500;
    const streams = h.state.streams;
    const block = h.state.blocked = deferred(); const refresh = h.ctx.load(); await tick();
    assert.equal(h.child('PodLog'), log);
    assert.equal(h.state.aborts, 0);
    block.resolve({ data: { items: [pod()] } }); await refresh; await tick();
    assert.equal(h.child('PodLog'), log);
    assert.equal(log.currentContainer, 'sidecar'); assert.equal(log.follow, false); assert.equal(log.currentTailLines, 500);
    assert.equal(h.state.streams, streams);
    const failure = h.state.blocked = deferred(); const request = h.ctx.load(); await tick();
    failure.reject(new Error('offline')); await request; await tick();
    assert.equal(h.child('PodLog'), log); assert.equal(h.state.aborts, 0);
});

test('a replacement Pod with the same name initializes its log terminal after the new DOM is mounted', async t => {
    const h = mountPanel('logs'); t.after(() => h.app.unmount()); await tick();
    const first = h.child('PodLog'); assert(first.term);
    h.state.pods = [pod('site-pod', 'replacement')]; await h.ctx.load(); await tick();
    const second = h.child('PodLog');
    assert.notEqual(second, first); assert(second.term, 'a same-name Pod replacement must not leave a blank log terminal');
    assert.equal(h.state.streams, 2); assert.equal(h.state.aborts, 1);
});

test('a selected log container restart reconnects the stream while preserving the controls and terminal', async t => {
    const h = mountPanel('logs'); t.after(() => h.app.unmount()); await tick();
    const log = h.child('PodLog'), terminal = log.term;
    log.currentContainer = 'sidecar'; log.follow = false; log.currentTailLines = 500;
    const nextPod = pod(); nextPod.status.containerStatuses[1].containerID = 'sidecar-restarted';
    h.state.pods = [nextPod]; await h.ctx.load(); await tick();
    assert.equal(h.child('PodLog'), log); assert.equal(log.term, terminal);
    assert.equal(log.currentContainer, 'sidecar'); assert.equal(log.follow, false); assert.equal(log.currentTailLines, 500);
    assert.equal(h.state.streams, 2, 'refresh reconnects the newly selected running container instance');
    const count = h.state.streams;
    h.state.pods = [pod('site-pod', 'site-pod', 'unselected-web-restart')];
    h.state.pods[0].status.containerStatuses[1].containerID = 'sidecar-restarted';
    await h.ctx.load(); await tick(); assert.equal(h.state.streams, count, 'an unrelated container restart does not reopen the selected stream');
});

test('replacing, restarting, switching, or removing a terminal target tears down only the old session', async t => {
    const h = mountPanel('terminal'); t.after(() => h.app.unmount()); await tick();
    h.state.pods = [pod('site-pod', 'replacement')]; await h.ctx.load(); await tick();
    assert.equal(h.state.closes, 1, 'a new Pod UID with the same name is a new target');
    h.state.pods = [pod('site-pod', 'replacement', 'container-2')]; await h.ctx.load(); await tick();
    assert.equal(h.state.closes, 2, 'a restarted container needs a new connection');
    h.state.pods.push(pod('other-pod')); await h.ctx.load(); await tick();
    h.ctx.podName = 'other-pod'; await tick(); assert.equal(h.state.closes, 3);
    h.state.pods = []; await h.ctx.load(); await tick(); assert.equal(h.state.closes, 4);
    assert.deepEqual(h.state.exits, Array(4).fill('exit\n'));
});

test('a stale refresh cannot restore a previous application after navigation', async t => {
    const h = mountPanel('terminal'); t.after(() => h.app.unmount()); await tick();
    const block = h.state.blocked = deferred(); const old = h.ctx.load(); await tick();
    h.state.blocked = null; h.state.pods = [pod('new-site-pod')];
    h.route.params.group = 'new-site'; h.route.fullPath = '/new-site/terminal'; await tick();
    assert.equal(h.ctx.podName, 'new-site-pod');
    block.resolve({ data: { items: [pod()] } }); await old; await tick();
    assert.equal(h.ctx.podName, 'new-site-pod');
    assert.equal(h.ctx.loading, false);
});

test('a first-load error shows no old tool and can recover on retry', async t => {
    const h = mountPanel('terminal'); t.after(() => h.app.unmount());
    h.state.blocked = deferred(); await tick();
    assert.equal(h.ctx.loading, true); assert.equal(h.state.closes, 0);
    h.state.blocked.reject(new Error('not available')); await tick();
    assert.equal(h.ctx.loading, false); assert.match(h.ctx.error, /not available/); assert.equal(h.ctx.selectedPod, undefined);
    h.state.blocked = null; await h.ctx.load(); await tick();
    assert.equal(h.ctx.error, ''); assert.equal(h.ctx.podName, 'site-pod');
});

test('saving a permanent file remains a draft until apply, with cancel/leave decisions preserved', async () => {
    const fileComponent = load('src/views/app/pages/files.vue').exports.default;
    const panelComponent = load('src/views/app/pages/site-panel.vue').exports.default;
    const tab = { name: 'config.php', path: '/config.php', mf: '/config.php', checkForever: true, modified: true };
    const file = { ...fileComponent.data(), currentTab: tab, showPath: '/',
        editor: { state: { doc: { toString: () => 'updated config' } } },
        $message: { success() {} }, refreshCatch() {}, getMfList: async () => {}, getFileList() {}, $emit() {},
        mfList: [{ mountPath: '/config.php' }], findMfByPath: () => file.mfList[0], editMf: async () => {},
    };
    file.file.openTabs = [tab];
    let confirmation;
    const panel = { $refs: { files: file }, $modal: { confirm: options => { confirmation = options; } } };
    for (const [name, method] of Object.entries(panelComponent.methods)) panel[name] = method.bind(panel);
    assert.equal(panel.hasFileDraft(), true);
    await fileComponent.methods.savefile.call(file);
    assert.equal(tab.modified, false); assert.equal(file.mfEdit, true);
    assert.equal(panel.hasFileDraft(), true, 'a saved-but-unapplied permanent file must still trigger the guard');
    const cancel = panel.canLeave(); confirmation.onCancel(); assert.equal(await cancel, false);
    const leave = panel.canLeave(); confirmation.onOk(); assert.equal(await leave, true);
    fileComponent.methods.submitCatch.call(file); await tick();
    assert.equal(panel.hasFileDraft(), false); assert.equal(await panel.canLeave(), true);
    file.fileCatch = [{ fileName: 'new.php', fileValue: 'pending', path: '/' }];
    assert.equal(panel.hasFileDraft(), true, 'staged new permanent files are protected even without an editor tab');
});
