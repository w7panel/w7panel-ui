const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function harness({ pathname = '/dialog/appgroup/site/site-panel/terminal', search = '', hash = '#paneltoken=old-frame',
    storedToken = 'old-frame', storedRefresh = 'refresh-old', powered = false, props = {}, microProps = null,
    onRequest } = {}) {
    const storage = new Map(Object.entries({ 'w7panel-token': storedToken, 'w7panel-refresh-token': storedRefresh,
        'w7panel-userinfo': '{"username":"host"}', 'w7panel-permission': '["*"]', 'w7panel-webshell': 'true' }));
    const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
    const location = {}, sent = [], navigation = [], events = [];
    function locate(value) {
        const url = new URL(value, 'https://panel.test');
        for (const name of ['href', 'origin', 'protocol', 'pathname', 'search', 'hash']) location[name] = url[name];
    }
    locate(pathname + search + hash);
    const window = { location, __POWERED_BY_WUJIE__: powered, $wujie: { props },
        __MICRO_APP_ENVIRONMENT__: !!microProps, microApp: { getData: () => microProps },
        dispatchEvent: event => events.push(event.type), history: { state: {}, replaceState(_, __, target) { locate(target); } } };
    function source(relative, imports) {
        const filename = path.join(root, relative), exports = {};
        const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
            module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
        } }).outputText;
        vm.runInNewContext(code, { exports, require: name => imports[name], window, localStorage, URL, URLSearchParams,
            CustomEvent: class { constructor(type) { this.type = type; } }, AbortController, console,
        }, { filename });
        return exports;
    }
    const auth = source('src/utils/auth.ts', { './permission-match': { expandPermissionValues: value => value } });
    let request, fulfilled, rejected;
    const axios = async config => {
        config = request({ ...config, headers: { ...config.headers } });
        sent.push({ ...config, headers: { ...config.headers } });
        try {
            const result = await onRequest?.(config, { storage, auth });
            return fulfilled({ status: 200, data: result === undefined ? {} : result, config });
        } catch (error) { error.config = config; return rejected(error); }
    };
    axios.defaults = {};
    axios.get = (url, config) => axios({ ...config, url, method: 'GET' });
    axios.post = (url, data, config) => axios({ ...config, url, data, method: 'POST' });
    axios.interceptors = { request: { use(callback) { request = callback; } }, response: { use(ok, fail) { fulfilled = ok; rejected = fail; } } };
    source('src/api/interceptor.ts', {
        axios, '@/utils/auth': auth,
        '@arco-design/web-vue': { Notification: { error() {} } },
        '@/store': { useLoadingStore: () => ({}), useNamespaceStore: () => ({}) },
        '@/router': { __esModule: true, default: { currentRoute: { value: { name: 'dialog-site-panel', fullPath: location.pathname + location.search + location.hash } }, push(target) { navigation.push(target); } } },
        '@/utils/repo-notice': { showRepoHtmlNotice: () => false },
    });
    return { auth, axios, storage, localStorage, location, locate, sent, navigation, events };
}
const unauthorized = () => ({ response: { status: 401, data: { message: 'expired' } } });

test('a site frame refresh retries with the renewed token and updates only its matching shared session', async () => {
    const state = harness({ search: '?paneltoken=legacy-old', onRequest(config) {
        if (config.url === '/panel-api/v1/auth/refresh-token2') {
            assert.equal(config.data.token, 'refresh-old');
            return { token: 'new-frame', refreshToken: 'refresh-new' };
        }
        if (config.headers.Authorization === 'Bearer old-frame') throw unauthorized();
        assert.equal(config.headers.Authorization, 'Bearer new-frame');
        return { ok: true };
    } });
    assert.equal((await state.axios({ url: '/panel-api/v1/exec2' })).data.ok, true);
    assert.equal(state.auth.getToken(), 'new-frame');
    assert.equal(new URLSearchParams(state.location.hash.slice(1)).get('paneltoken'), 'new-frame');
    assert.equal(new URLSearchParams(state.location.search).has('paneltoken'), false);
    assert.equal(state.storage.get('w7panel-token'), 'new-frame');
    assert.equal(state.storage.get('w7panel-refresh-token'), 'refresh-new');
    assert.equal(state.storage.get('w7panel-userinfo'), '{"username":"host"}');
    assert.equal(state.navigation.length, 0);
});

test('concurrent frame 401s share one refresh and both replay with the renewed credential', async () => {
    let refreshes = 0, release;
    const pending = new Promise(resolve => { release = resolve; });
    const state = harness({ async onRequest(config) {
        if (config.url === '/panel-api/v1/auth/refresh-token2') {
            refreshes++; await pending;
            return { token: 'new-frame', refreshToken: 'refresh-new' };
        }
        if (config.headers.Authorization === 'Bearer old-frame') throw unauthorized();
        assert.equal(config.headers.Authorization, 'Bearer new-frame');
        return { ok: true };
    } });
    const requests = [state.axios({ url: '/panel-api/v1/one' }), state.axios({ url: '/panel-api/v1/two' })];
    await new Promise(resolve => setImmediate(resolve));
    release();
    assert((await Promise.all(requests)).every(result => result.data.ok));
    assert.equal(refreshes, 1);
    assert.equal(state.navigation.length, 0);
});

test('a stale frame cannot use or clear a different current host session', async () => {
    const state = harness({ storedToken: 'other-session', storedRefresh: 'other-refresh', search: '?paneltoken=legacy-old', onRequest() { throw unauthorized(); } });
    const before = [...state.storage];
    assert.equal(state.auth.getRefreshToken(), '');
    await assert.rejects(state.axios({ url: '/panel-api/v1/exec2' }));
    assert.deepEqual([...state.storage], before);
    assert.equal(state.sent.some(request => request.url.includes('/refresh-token2')), false);
    assert.equal(state.auth.getToken(), '');
    assert.equal(state.auth.isLogin(), false);
    assert.equal(new URLSearchParams(state.location.hash.slice(1)).has('paneltoken'), false);
    assert.equal(new URLSearchParams(state.location.search).has('paneltoken'), false);
    assert.equal(state.navigation.length, 0, 'an expired frame must not enter the ordinary login flow using host storage');
});

test('clearing frame credentials removes fragment and legacy query without falling back to host login', () => {
    const state = harness({ hash: '#paneltoken=frame&keep=1', search: '?paneltoken=legacy&namespace=tenant', storedToken: 'host-other' });
    const before = [...state.storage];
    state.auth.clearToken();
    assert.equal(state.auth.getToken(), '');
    assert.equal(state.auth.getRefreshToken(), '');
    assert.equal(state.auth.isLogin(), false);
    assert.deepEqual([...state.storage], before);
    assert.equal(new URLSearchParams(state.location.hash.slice(1)).get('keep'), '1');
    assert.equal(new URLSearchParams(state.location.search).get('namespace'), 'tenant');
    assert.equal(state.location.search.includes('paneltoken'), false);
    assert.equal(state.location.hash.includes('paneltoken'), false);
});

test('failed frame renewal clears only the frame and never logs the shared host session out', async () => {
    const state = harness({ onRequest(config) {
        if (config.url === '/panel-api/v1/auth/refresh-token2') throw { response: { status: 500, data: { message: 'renewal unavailable' } } };
        throw unauthorized();
    } });
    const before = [...state.storage];
    await assert.rejects(state.axios({ url: '/panel-api/v1/exec2', noAlert: true }));
    assert.deepEqual([...state.storage], before);
    assert.equal(state.auth.getToken(), '');
    assert.equal(state.auth.isLogin(), false);
    assert.equal(state.navigation.length, 0);
});

test('a parent token replacement during a request is not silently adopted by an older frame', async () => {
    const state = harness({ onRequest(_, { storage }) {
        storage.set('w7panel-token', 'replacement-parent');
        storage.set('w7panel-refresh-token', 'replacement-parent-refresh');
        throw unauthorized();
    } });
    await assert.rejects(state.axios({ url: '/panel-api/v1/exec2' }));
    assert.equal(state.sent.length, 1);
    assert.equal(state.auth.getToken(), '');
    assert.equal(state.storage.get('w7panel-token'), 'replacement-parent');
    assert.equal(state.storage.get('w7panel-refresh-token'), 'replacement-parent-refresh');
    assert.equal(state.navigation.length, 0);
});

test('a frame without its own credential cannot inherit a logged-in host session', () => {
    const state = harness({ hash: '', storedToken: 'host', storedRefresh: 'host-refresh' });
    assert.equal(state.auth.getToken(), '');
    assert.equal(state.auth.getRefreshToken(), '');
    assert.equal(state.auth.isLogin(), false);
});

test('a renewal response cannot overwrite a host session changed while the frame request was in flight', async () => {
    const state = harness({ onRequest(config, { storage }) {
        if (config.url === '/panel-api/v1/auth/refresh-token2') {
            storage.set('w7panel-token', 'other-user');
            storage.set('w7panel-refresh-token', 'other-user-refresh');
            return { token: 'new-frame', refreshToken: 'new-frame-refresh' };
        }
        if (config.headers.Authorization === 'Bearer old-frame') throw unauthorized();
        assert.equal(config.headers.Authorization, 'Bearer new-frame');
        return { ok: true };
    } });
    await state.axios({ url: '/panel-api/v1/exec2' });
    assert.equal(state.auth.getToken(), 'new-frame');
    assert.equal(state.auth.getRefreshToken(), 'new-frame-refresh');
    assert.equal(state.storage.get('w7panel-token'), 'other-user');
    assert.equal(state.storage.get('w7panel-refresh-token'), 'other-user-refresh');
});

test('ordinary panels and dialog or Wujie entries keep their original token priority and storage behavior', () => {
    const panel = harness({ pathname: '/app', hash: '#paneltoken=ignored', storedToken: 'panel', storedRefresh: 'panel-refresh' });
    assert.equal(panel.auth.getToken(), 'panel');
    panel.auth.setToken('panel-new'); panel.auth.setRefreshToken('panel-refresh-new');
    assert.equal(panel.auth.getToken(), 'panel-new');
    assert.equal(panel.auth.getRefreshToken(), 'panel-refresh-new');
    panel.auth.clearToken();
    assert.equal(panel.auth.getToken(), null);
    assert.equal(panel.storage.has('w7panel-userinfo'), false);
    const dialog = harness({ pathname: '/dialog/appgroup/site/micro', search: '?paneltoken=dialog-token', storedToken: 'panel' });
    assert.equal(dialog.auth.getToken(), 'dialog-token');
    dialog.auth.setToken('stored-new');
    assert.equal(dialog.auth.getToken(), 'dialog-token');
    const wujie = harness({ pathname: '/app', powered: true, props: { paneltoken: 'wujie-prop', refreshToken: 'wujie-refresh' } });
    wujie.storage.set('iframe-w7panel-token', 'stored-iframe');
    assert.equal(wujie.auth.getToken(), 'wujie-prop');
    assert.equal(wujie.auth.getRefreshToken(), 'wujie-refresh');
    const micro = harness({ pathname: '/app', microProps: { token: 'micro-prop' } });
    assert.equal(micro.auth.getToken(), 'micro-prop');
});
