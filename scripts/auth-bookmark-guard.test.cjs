const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function guardFor({ token, role, permissions, verify = async () => ({ data: { 'w7.cc/menu': '[]' } }) }) {
  let guard;
  const session = { token };
  const auth = {
    isLogin: () => Boolean(session.token),
    getToken: () => session.token,
    getPermission: () => permissions,
    getK8sinfo: () => ({ 'w7.cc/role': role }),
  };
  const imports = {
    'vue-router': { createRouter: () => ({ beforeEach: fn => { guard = fn; }, afterEach() {}, onError() {} }), createWebHistory: () => ({}) },
    nprogress: { configure() {} },
    'nprogress/nprogress.css': {},
    '@/store': { useNamespaceStore: () => ({ namespaceList: [] }), useAppStore: () => ({ changeMenuFilter() {} }) },
    './routes': { appRoutes: [] },
    './routes/base': { REDIRECT_MAIN: {}, NOT_FOUND_ROUTE: {} },
    '@/utils/auth': auth,
    '@/utils/permission-match': { hasPermission: (values, path) => values.includes(path.replace(/^\//, '')) },
    '@/hooks/k3k-info': { __esModule: true, default: () => verify(session) },
  };
  const source = fs.readFileSync('src/router/index.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, require: name => imports[name],
    window: { sessionStorage: { getItem() {}, removeItem() {} } },
    sessionStorage: { getItem() {}, removeItem() {} },
  });
  return async (path = '/cluster/panel') => {
    const to = { path, fullPath: path, name: 'cluster-panel', meta: { requiresAuth: true }, matched: [
      { path: '/cluster', meta: { key: 'cluster' } },
      { path: '/cluster/panel', meta: { key: 'cluster-panel' } },
    ] };
    let destination;
    await guard(to, {}, result => { destination = result; });
    return destination;
  };
}

test('bookmark without a session goes to login', async () => {
  assert.equal((await guardFor({})()).name, 'login');
});

test('expired bookmark is checked before the protected route is opened', async () => {
  const navigate = guardFor({ token: 'expired', verify: async session => { session.token = ''; throw new Error('401'); } });
  const destination = await navigate();
  assert.equal(destination.name, 'login');
  assert.equal(destination.query.redirect, '/cluster/panel');
});

test('valid normal user is sent to CKM and cluster user stays on the bookmark', async () => {
  assert.equal((await guardFor({ token: 'valid', role: 'normal', permissions: [] })()).path, '/appgroup/w7panel-ckm-root/micro');
  assert.equal(await guardFor({ token: 'valid', role: 'founder', permissions: ['cluster', 'cluster/panel'] })(), undefined);
});

test('401 refreshes once and retries the original request', async () => {
  let rejectResponse, retried, token = 'old', refreshes = 0, cleared = 0, retryFailure;
  const axios = config => { retried = config; return retryFailure ? Promise.reject(retryFailure) : Promise.resolve({ data: 'retried' }); };
  axios.defaults = {};
  axios.get = () => Promise.resolve();
  axios.post = async () => { refreshes++; return { data: { token: 'new', refreshToken: 'new-refresh' } }; };
  axios.interceptors = {
    request: { use() {} },
    response: { use: (_, rejected) => { rejectResponse = rejected; } },
  };
  const imports = {
    axios,
    '@arco-design/web-vue': { Notification: { error() {} } },
    '@/store': { useLoadingStore: () => ({}), useNamespaceStore: () => ({}) },
    '@/utils/auth': {
      clearToken() { cleared++; }, getToken: () => token, setToken: value => { token = value; },
      setRefreshToken() {}, getRefreshToken: () => 'refresh',
    },
    '@/router': { __esModule: true, default: { currentRoute: { value: { name: 'cluster-panel', fullPath: '/cluster/panel' } }, push() {} } },
    '@/utils/repo-notice': { showRepoHtmlNotice: () => false },
  };
  const source = fs.readFileSync('src/api/interceptor.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: {}, require: name => imports[name], window: {}, URL, URLSearchParams });
  const result = await rejectResponse({ response: { status: 401 }, config: {
    url: '/panel-api/v1/k3k/info', headers: { Authorization: 'Bearer old' }, signal: 'aborted',
  } });
  assert.equal(result.data, 'retried');
  assert.equal(refreshes, 1);
  assert.equal(retried._authRetried, true);
  assert.equal(retried.signal, undefined);
  retryFailure = { response: { status: 403 } };
  await assert.rejects(rejectResponse({ response: { status: 401 }, config: {
    url: '/panel-api/v1/k3k/info', headers: { Authorization: 'Bearer new' },
  } }), error => error === retryFailure);
  assert.equal(cleared, 0);
});
