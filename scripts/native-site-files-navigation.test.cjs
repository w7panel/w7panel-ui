const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Vue = require('vue');
const { createRenderer, nextTick } = Vue;
const { compile } = require('@vue/compiler-dom');
const { createRouter, createMemoryHistory } = require('vue-router');

const root = path.resolve(__dirname, '..');
const defaultMocks = new Proxy({ __esModule: true, default: {} }, { get: (value, key) => key in value ? value[key] : () => {} });
function component(filename, mocks = {}) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => mocks[name] || defaultMocks,
    window: { location: { origin: 'http://panel.test' } }, localStorage: { setItem() {} }, URL,
  });
  return exports.default;
}
function resource(name, kind = 'Deployment') {
  return { kind, metadata: { name, namespace: 'tenant' }, spec: { template: { spec: {
    containers: [{ name: `${name}-container`, volumeMounts: [] }],
  } }, selector: { matchLabels: { app: name } } } };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() { await nextTick(); await new Promise(resolve => setImmediate(resolve)); await nextTick(); }
const nativeRoute = (name, directory = '/www/wwwroot', kind = 'deployments') => (
  `/app/appgroup/site/${kind}/${name}/files?do=__panel_site_files__&microapp=site-tool#path=${encodeURIComponent(encodeURIComponent(directory))}`
);

async function harness({ initial = 'worker', initialRoute, getResource, getDirectory, pwd = '/' } = {}) {
  const resources = [], pods = [], mounts = [], instances = [], lists = [];
  const api = { async get(url, config) {
    if (url.includes('/pods')) {
      const selector = config.params.labelSelector;
      pods.push(selector);
      const name = selector.slice('app='.length);
      return { data: { items: [{ metadata: { name: `${name}-pod`, namespace: 'tenant' },
        spec: { containers: [{ name: `${name}-container` }] }, status: { phase: 'Running', hostIP: '192.0.2.1',
          containerStatuses: [{ name: `${name}-container`, containerID: `containerd://${name}` }] },
      }] } };
    }
    resources.push(url);
    if (getResource) return getResource(url);
    const kind = url.includes('/statefulsets/') ? 'StatefulSet' : 'Deployment';
    return { data: resource(url.split('/').pop(), kind) };
  } };
  const panelApi = { async get(url, config) {
    assert.equal(url, '/pid');
    return { data: { podName: config.params.podName, containerName: config.params.containerName, namespace: 'tenant',
      pwd, pid: 1, webdavUrl: '/webdav/', webdavToken: 'token' } };
  } };
  const file = component('src/views/app/pages/files.vue', { '@/utils/api': { k8sproxy: api, panelApi },
    '@/store': { useNamespaceStore: () => ({ namespace: 'tenant' }) },
  });
  const firstMounted = file.mounted;
  file.mounted = function () { instances.push(this); if (firstMounted) firstMounted.call(this); };
  file.render = () => null;
  file.methods = { ...file.methods,
    getDataVm() { mounts.push(this.appData.metadata.name); },
    getUserByWebDAV() {}, testForever() { return true; },
    async getDir() {
      const directory = this.form.path;
      lists.push({ directory, pod: this.form.pod_name });
      return getDirectory ? getDirectory(directory, this) : [{ key: directory, name: directory, type: 'directory' }];
    },
  };
  const detail = component('src/views/app/apps/detail.vue', { '@/utils/api': { k8sproxy: api } });
  const history = createMemoryHistory();
  const router = createRouter({ history, routes: [{ path: '/app/appgroup/:group/:kind/:id/files', name: 'app-detail-files', component: file }] });
  await router.push(initialRoute || nativeRoute(initial, '/old'));
  let host;
  const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText() {}, setElementText() {}, parentNode() {}, nextSibling() {}, insert() {}, remove() {}, patchProp() {},
  });
  // Compile the production native router-view fragment so its data gate and
  // key are tested together with the actual component watchers and router.
  const detailSource = fs.readFileSync(path.join(root, 'src/views/app/apps/detail.vue'), 'utf8');
  const nativeView = detailSource.match(/<router-view v-else-if=[^\n]+/)[0].replace('v-else-if=', 'v-if=');
  const render = new Function('Vue', compile(nativeView, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
  const app = renderer.createApp({
    data: () => ({ data: resource(initial, router.currentRoute.value.params.kind === 'statefulsets' ? 'StatefulSet' : 'Deployment'),
      namespaceActive: 'tenant', dataRequestId: 0, microDisposed: false, isHelmPage: false, isSiteFilesPage: false, appname: '',
      identifie: 'site', applist: [], title: 'Site' }),
    computed: Object.fromEntries(['entryGroup', 'nativeFileResourceKey', 'nativePageData']
      .filter(name => detail.computed[name]).map(name => [name, detail.computed[name]])),
    watch: detail.watch.nativeFileResourceKey ? { nativeFileResourceKey: detail.watch.nativeFileResourceKey } : {},
    methods: { dataDetail: detail.methods.dataDetail, openForm() {} },
    mounted() { host = this; },
    render,
  });
  app.use(router);
  app.mount({});
  await settle();
  return { app, router, history, host, resources, pods, mounts, lists, instances,
    current: () => instances[instances.length - 1],
    async back() { router.back(); await settle(); },
    async forward() { router.forward(); await settle(); },
  };
}

test('native file target changes remount only after matching workload data arrives', async t => {
  const pending = deferred();
  const state = await harness({ getResource: () => pending.promise });
  t.after(() => state.app.unmount());
  const old = state.current();
  assert.equal(old.form.pod_name, 'worker-pod');
  await state.router.push(nativeRoute('site'));
  await settle();
  assert.equal(state.host.nativePageData, null);
  assert.equal(old.filesDisposed, true);
  assert.equal(state.instances.length, 1);
  pending.resolve({ data: resource('site') });
  await settle();
  assert.equal(state.current().appData.metadata.name, 'site');
  assert.equal(state.current().form.pod_name, 'site-pod');
  assert.equal(state.current().form.containerName, 'site-container');
  assert.equal(state.current().form.path, '/www/wwwroot');
  assert.deepEqual(state.pods, ['app=worker', 'app=site']);
  assert.equal(state.current().loading, false);
});

test('directory reset and browser Back/Forward sync the existing file instance without extra history', async t => {
  const state = await harness({ initial: 'site', initialRoute: nativeRoute('site') });
  t.after(() => state.app.unmount());
  const file = state.current();
  file.form.path = '/www/wwwroot/public';
  await settle();
  await state.router.push(nativeRoute('site'));
  await settle();
  assert.equal(file.form.path, '/www/wwwroot');
  assert.equal(state.current(), file);
  assert.equal(state.instances.length, 1);
  await state.back();
  assert.equal(file.form.path, '/www/wwwroot/public');
  assert.equal(state.router.currentRoute.value.hash, '#path=%2Fwww%2Fwwwroot%2Fpublic');
  await state.back();
  assert.equal(file.form.path, '/www/wwwroot');
  await state.forward();
  assert.equal(file.form.path, '/www/wwwroot/public');
  await state.forward();
  assert.equal(file.form.path, '/www/wwwroot');
  assert.equal(state.instances.length, 1);
  assert.equal(file.fileList[0].name, '/www/wwwroot');
});

test('returning to an initial URL without a path restores the pid working directory', async t => {
  const state = await harness({ initial: 'site', initialRoute: '/app/appgroup/site/deployments/site/files', pwd: '/home/site' });
  t.after(() => state.app.unmount());
  assert.equal(state.current().form.path, '/home/site');
  assert.equal(state.router.currentRoute.value.hash, '');
  state.current().form.path = '/www/wwwroot';
  await settle();
  await state.back();
  assert.equal(state.current().form.path, '/home/site');
  assert.equal(state.router.currentRoute.value.hash, '');
});

test('different workload kinds with the same name cannot reuse old data or pod', async t => {
  const state = await harness({ initial: 'site', initialRoute: nativeRoute('site') });
  t.after(() => state.app.unmount());
  const old = state.current();
  await state.router.push(nativeRoute('site', '/stateful', 'statefulsets'));
  await settle();
  assert.notEqual(state.current(), old);
  assert.equal(state.current().appData.kind, 'StatefulSet');
  assert.equal(state.current().form.path, '/stateful');
  assert.equal(state.resources.at(-1), '/apis/apps/v1/namespaces/tenant/statefulsets/site');
});

test('a slower previous workload response cannot replace the active workload', async t => {
  const a = deferred(), b = deferred();
  const state = await harness({ getResource: url => url.endsWith('/a') ? a.promise : b.promise });
  t.after(() => state.app.unmount());
  await state.router.push(nativeRoute('a'));
  await settle();
  await state.router.push(nativeRoute('b'));
  await settle();
  b.resolve({ data: resource('b') });
  await settle();
  a.resolve({ data: resource('a') });
  await settle();
  assert.equal(state.host.data.metadata.name, 'b');
  assert.equal(state.current().form.pod_name, 'b-pod');
  assert.deepEqual(state.pods, ['app=worker', 'app=b']);
  await state.back();
  assert.equal(state.current().appData.metadata.name, 'a');
  await state.forward();
  assert.equal(state.current().appData.metadata.name, 'b');
});

test('special-character directory hashes decode once for both external and internal navigation', async t => {
  const directory = '/www/中文 100% +?#&=/literal%2F';
  const state = await harness({ initial: 'site', initialRoute: nativeRoute('site', directory) });
  t.after(() => state.app.unmount());
  const file = state.current();
  assert.equal(file.form.path, directory);
  file.form.path = '/www/other';
  await settle();
  await state.back();
  assert.equal(file.form.path, directory);
  assert.equal(state.instances.length, 1);
});

test('a hash change during first list loading wins when initialization completes', async t => {
  const pending = deferred();
  const state = await harness({ initial: 'site', initialRoute: nativeRoute('site', '/'), getDirectory: directory => directory === '/' ? pending.promise : [{ name: directory, type: 'directory' }] });
  t.after(() => state.app.unmount());
  const file = state.current();
  assert.equal(file.isInitializingFileList, true);
  await state.router.push(nativeRoute('site', '/b'));
  await settle();
  pending.resolve([{ name: '/', type: 'directory' }]);
  await settle();
  assert.equal(file.form.path, '/b');
  assert.equal(file.fileList[0].name, '/b');
  assert.equal(file.loading, false);
});

test('a slow directory response is ignored and loading clears after the latest success or failure', async t => {
  const a = deferred(), b = deferred(), c = deferred();
  const pending = { '/a': a, '/b': b };
  let failNext = false;
  const state = await harness({ initial: 'site', initialRoute: nativeRoute('site'), getDirectory: directory => failNext ? c.promise : pending[directory]?.promise || [{ name: directory, type: 'directory' }] });
  t.after(() => state.app.unmount());
  const file = state.current();
  file.form.path = '/a'; await settle();
  file.form.path = '/b'; await settle();
  b.resolve([{ name: 'current-b', type: 'directory' }]); await settle();
  a.resolve([{ name: 'stale-a', type: 'directory' }]); await settle();
  assert.equal(file.fileList[0].name, 'current-b');
  assert.equal(file.loading, false);
  // Call the actual list method explicitly so a rejected transport is observed.
  failNext = true;
  const request = file.getFileList();
  c.reject(new Error('transport failed'));
  await assert.rejects(request, /transport failed/);
  await settle();
  assert.equal(file.loading, false);
});
