const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/views/app/pages/files.vue');
const source = fs.readFileSync(filename, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const copy = value => JSON.parse(JSON.stringify(value));
function workload() {
  return { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'site', namespace: 'tenant' }, spec: {
    selector: { matchLabels: { app: 'site' } }, template: { spec: { containers: [{ name: 'web', volumeMounts: [] }] } },
  } };
}
function pod(name = 'site-pod', date = '2026-11-17T01:00:00Z') {
  return { metadata: { name, namespace: 'tenant', creationTimestamp: date }, spec: { containers: [{ name: 'sysbox-rootfs' }, { name: 'web' }] },
    status: { phase: 'Running', hostIP: '192.0.2.10', containerStatuses: [
      { name: 'sysbox-rootfs', containerID: 'containerd://helper', state: { running: {} } },
      { name: 'web', containerID: `containerd://${name}-web`, state: { running: {} } },
    ] } };
}
function harness({ resource = workload(), pods = [pod()], readError, readResource, component = true, origin = '', route = {} } = {}) {
  const calls = [], errors = [], lists = [];
  const api = {
    k8sproxy: { async get(url, options) {
      calls.push({ url, options: copy(options || {}) });
      if (url.endsWith('/pods')) return { data: { items: pods } };
      if (readResource) return readResource(url);
      if (readError) throw new Error(readError);
      return { data: resource };
    } },
    panelApi: { async get(url, options) {
      calls.push({ url, options: copy(options || {}) });
      assert.equal(url, '/pid');
      return { data: { podName: options.params.podName || 'node-agent', containerName: options.params.containerName || 'agent',
        namespace: options.params.namespace, pid: 42, pwd: '/', webdavUrl: '/webdav/42/', webdavToken: 'test-token' } };
    } },
  };
  const exports = {};
  const mock = new Proxy({ __esModule: true, default: {} }, { get: (target, key) => key in target ? target[key] : () => {} });
  vm.runInNewContext(code, { exports, URL, window: { location: { origin: 'https://panel.test' } }, localStorage: { setItem() {} },
    require(name) {
      if (name === '@/utils/api') return api;
      if (name === '@/store') return { useNamespaceStore: () => ({ namespace: 'tenant' }) };
      return mock;
    },
  }, { filename });
  const definition = exports.default;
  const ctx = { ...definition.data(), is_component: component, origin, data: resource,
    componentData: { namespace: 'tenant', kind: 'deployments', id: 'site', path: '%2Fwww%2Fwwwroot' },
    $route: { name: component ? 'site-panel' : 'app-detail-files', params: { kind: 'deployments', id: 'site' }, query: {}, hash: '', ...route },
    $message: { error: message => errors.push(message) },
  };
  for (const [name, method] of Object.entries(definition.methods)) ctx[name] = method.bind(ctx);
  for (const [name, getter] of Object.entries(definition.computed)) Object.defineProperty(ctx, name, { get: getter.bind(ctx) });
  ctx.getDataVm = () => {};
  ctx.getUserByWebDAV = () => {};
  ctx.getFileList = async () => { lists.push(ctx.form.path); };
  return { ctx, calls, errors, lists, definition, start: () => definition.created.call(ctx) };
}
const podReads = state => state.calls.filter(call => call.url.endsWith('/pods'));
const pidReads = state => state.calls.filter(call => call.url === '/pid');

test('embedded file initialization stops before querying Pods when the workload read fails', async () => {
  const state = harness({ readError: 'deployment read failed' });
  await state.start();
  assert.equal(podReads(state).length, 0);
  assert.equal(pidReads(state).length, 0);
  assert.equal(state.lists.length, 0);
  assert.match(state.ctx.initializationError, /deployment read failed/);
});

test('invalid or missing workload data and empty selectors cannot trigger a namespace-wide Pod lookup', async t => {
  const variants = [
    ['null response', null], ['empty response', {}],
    ['wrong name', { ...workload(), metadata: { name: 'other', namespace: 'tenant' } }],
    ['wrong namespace', { ...workload(), metadata: { name: 'site', namespace: 'other' } }],
    ['empty selector', { ...workload(), spec: { ...workload().spec, selector: {} } }],
    ['missing container', { ...workload(), spec: { ...workload().spec, template: { spec: { containers: [] } } } }],
    ['invalid expression', { ...workload(), spec: { ...workload().spec, selector: { matchExpressions: [{ key: 'app', operator: 'Invalid' }] } } }],
  ];
  for (const [label, resource] of variants) await t.test(label, async () => {
    const state = harness({ resource });
    await state.start();
    assert.equal(podReads(state).length, 0);
    assert.equal(pidReads(state).length, 0);
    assert(state.ctx.initializationError);
  });
  const native = harness({ component: false, resource: null });
  await native.start();
  assert.equal(native.calls.length, 0);
  assert(native.ctx.initializationError);
});

test('file access matches the declared business container by name even when an injected helper is first in the Pod and statuses', async () => {
  const state = harness();
  await state.start();
  assert.equal(state.ctx.initializationError, '');
  assert.equal(pidReads(state).length, 1);
  const { containerName, containerId } = pidReads(state)[0].options.params;
  assert.equal(containerName, 'web');
  assert.equal(containerId, 'containerd://site-pod-web');
  assert.equal(state.ctx.form.containerName, 'web');
  assert.equal(state.ctx.form.path, '/www/wwwroot');
});

test('file access sends complete matchExpressions selectors instead of falling back to an empty selector', async () => {
  const resource = workload();
  resource.spec.selector = { matchExpressions: [
    { key: 'app', operator: 'In', values: ['site', 'site-preview'] },
    { key: 'retired', operator: 'DoesNotExist' },
    { key: 'tier', operator: 'NotIn', values: ['worker'] },
    { key: 'storage', operator: 'Exists' },
  ] };
  const state = harness({ resource });
  await state.start();
  assert.equal(podReads(state)[0].options.params.labelSelector, 'app in (site,site-preview),!retired,tier notin (worker),storage');
  assert.equal(pidReads(state)[0].options.params.containerName, 'web');
});

test('file access skips terminating, helper-only and stopped business containers and selects the newest usable Pod', async () => {
  const helperOnly = pod('helper-only', '2026-11-17T05:00:00Z');
  helperOnly.status.containerStatuses = helperOnly.status.containerStatuses.filter(status => status.name === 'sysbox-rootfs');
  const terminating = pod('terminating', '2026-11-17T06:00:00Z');
  terminating.metadata.deletionTimestamp = '2026-11-17T07:00:00Z';
  const stopped = pod('stopped', '2026-11-17T04:00:00Z');
  stopped.status.containerStatuses[1].state = { terminated: { exitCode: 1 } };
  const state = harness({ pods: [pod('older'), helperOnly, terminating, stopped, pod('newest', '2026-11-17T03:00:00Z')] });
  await state.start();
  assert.equal(pidReads(state)[0].options.params.podName, 'newest');
  assert.equal(pidReads(state)[0].options.params.containerName, 'web');
});

test('a missing business container status or container ID never falls back to the helper status', async t => {
  for (const variant of ['missing status', 'missing id', 'waiting']) await t.test(variant, async () => {
    const value = pod();
    if (variant === 'missing status') value.status.containerStatuses.pop();
    if (variant === 'missing id') delete value.status.containerStatuses[1].containerID;
    if (variant === 'waiting') value.status.containerStatuses[1].state = { waiting: { reason: 'ImagePullBackOff' } };
    const state = harness({ pods: [value] });
    await state.start();
    assert.equal(pidReads(state).length, 0);
    assert(state.ctx.initializationError);
  });
});

test('file access ignores Pods from another namespace and Pods whose spec omits the declared container', async () => {
  const otherNamespace = pod('other-namespace', '2026-11-17T06:00:00Z');
  otherNamespace.metadata.namespace = 'other';
  const helperSpec = pod('helper-spec', '2026-11-17T05:00:00Z');
  helperSpec.spec.containers = [{ name: 'sysbox-rootfs' }];
  const business = pod();
  business.status.containerStatuses[1].ready = false;
  const state = harness({ pods: [otherNamespace, helperSpec, business] });
  await state.start();
  assert.equal(pidReads(state).length, 1);
  assert.equal(pidReads(state)[0].options.params.podName, 'site-pod');
  assert.equal(pidReads(state)[0].options.params.containerName, 'web');
});

test('native file access preserves an explicit host IP preference among usable Pods', async () => {
  const preferred = pod('preferred');
  preferred.status.hostIP = '192.0.2.20';
  const state = harness({ component: false, pods: [preferred, pod('newer', '2026-11-17T05:00:00Z')],
    route: { query: { ip: '192.0.2.20' } } });
  await state.start();
  assert.equal(pidReads(state)[0].options.params.podName, 'preferred');
  assert.equal(pidReads(state)[0].options.params.HostIp, '192.0.2.20');
});

test('node file access keeps the existing host PID request without requiring a workload selector', async () => {
  const state = harness({ origin: 'nodes', component: false, resource: null, route: { query: { ip: '192.0.2.20' } } });
  await state.start();
  assert.equal(podReads(state).length, 0);
  assert.deepEqual(pidReads(state)[0].options.params, { namespace: 'tenant', HostIp: '192.0.2.20' });
  assert.equal(state.ctx.form.path, '/');
});

test('an unmounted embedded file page cannot continue initialization after a late workload response', async () => {
  let release;
  const state = harness({ readResource: () => new Promise(resolve => { release = resolve; }) });
  const pending = state.start();
  state.definition.beforeUnmount.call(state.ctx);
  release({ data: workload() });
  await pending;
  assert.equal(podReads(state).length, 0);
  assert.equal(pidReads(state).length, 0);
});
