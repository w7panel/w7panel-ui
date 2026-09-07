const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function storage() {
    const store = Object.create(null);
    Object.defineProperties(store, {
        getItem: { value: key => store[key] ?? null },
        setItem: { value: (key, value) => { store[key] = String(value); } },
        removeItem: { value: key => { delete store[key]; } },
    });
    return store;
}
function load(path, globals, imports = {}) {
    const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: name => imports[name], ...globals });
    return exports;
}

test('nested CKM auth cannot read or clear the host token/refresh token/cache', () => {
    const localStorage = storage();
    localStorage.setItem('w7panel-token', 'host');
    localStorage.setItem('w7panel-refresh-token', 'host-refresh');
    localStorage.setItem('w7panel-userinfo', '{"username":"founder"}');
    const prefix = 'w7panel-ckm-session:k3k-alice/a:';
    const window = { __POWERED_BY_WUJIE__: true, dispatchEvent() {}, $wujie: { props: { paneltoken: 'host-prop', refreshToken: 'host-refresh-prop', getCkmPanelToken: () => 'scoped', getCkmPanelStoragePrefix: () => prefix } } };
    const auth = load('src/utils/auth.ts', { window, localStorage, CustomEvent: class {} }, { './permission-match': { expandPermissionValues: x => x } });
    assert.equal(auth.getToken(), 'scoped');
    assert.equal(auth.getRefreshToken(), '');
    auth.setPermission(['app/apps']);
    auth.setUserInfo({ username: 'alice' });
    auth.setRefreshToken('unexpected');
    assert.equal(localStorage.getItem('w7panel-refresh-token'), 'host-refresh');
    assert.equal(localStorage.getItem(prefix + 'w7panel-userinfo'), '{"username":"alice"}');
    auth.clearToken();
    assert.equal(localStorage.getItem('w7panel-token'), 'host');
    assert.equal(localStorage.getItem('w7panel-userinfo'), '{"username":"founder"}');
    assert.equal(localStorage.getItem(prefix + 'w7panel-userinfo'), null);
});

test('opening/renewing sessions authenticates with host token and isolates target storage', async () => {
    const localStorage = storage(), sessionStorage = storage();
    let sent, destination;
    const api = load('src/utils/ckm-panel-session.ts', {
        localStorage, sessionStorage,
        window: { location: { assign: url => { destination = url; } } },
        fetch: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => ({ token: 'child', expiresAt: 9999999999 }) }; },
    }, { './auth': { getToken: () => 'host' } });
    const open = api.createOpenCkmPanel();
    await open({ namespace: 'k3k-alice', name: 'a', k8sToken: 'bootstrap' });
    assert.equal(sent.init.headers.Authorization, 'Bearer host');
    assert.equal(sent.init.credentials, 'omit');
    assert(!destination.includes('bootstrap') && !destination.includes('child'));
    const keyA = sessionStorage.getItem(api.CKM_SESSION_ACTIVE);
    localStorage.setItem(keyA + ':w7panel-permission', '["*"]');
    await open({ namespace: 'k3k-alice', name: 'b', k8sToken: 'bootstrap-b' });
    assert.equal(sessionStorage.getItem(keyA), null);
    assert.equal(localStorage.getItem(keyA + ':w7panel-permission'), null);
    await assert.rejects(open({ namespace: 'k3k-alice', name: 'a', k8sToken: 'old', navigate: false }), /切换或关闭/);
});

test('WebSocket keeps scoped token out of URL and renews without host refresh', async () => {
    let renewed = 0, socket;
    const window = { location: { href: 'https://panel.test/cluster/panel', protocol: 'https:' }, $wujie: { props: {
        getCkmPanelToken: () => 'scoped', getCkmPanelExpiresAt: () => 1,
        refreshCkmPanelSession: async () => { renewed++; },
    } } };
    const api = load('src/utils/panel-websocket.ts', { window, URL, WebSocket: class { constructor(url, protocols) { socket = { url, protocols }; } } });
    await api.createPanelWebSocket('/panel-api/v1/exec?api-token=old&podName=test');
    assert.equal(renewed, 1);
    assert.equal(socket.url, 'wss://panel.test/panel-api/v1/exec?podName=test');
    assert.equal(socket.protocols[1], 'w7panel-bearer.scoped');
});
