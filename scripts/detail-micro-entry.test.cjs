const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { parse } = require('@vue/compiler-dom');
const { parse: parseSfc } = require('@vue/compiler-sfc');

const root = path.resolve(__dirname, '..');
const detailPath = path.join(root, 'src/views/app/apps/detail.vue');
const detailSource = fs.readFileSync(detailPath, 'utf8');
const dynamicRoute = '#/w7-php-72-drcw/php:7.2-fpm-alpine/7.2';

function microApp() {
  return {
    metadata: {
      name: 'w7-php', namespace: 'default',
      labels: { 'w7.cc/group-name': 'w7-php', 'w7.cc/identifie': 'w7-php', 'w7.cc/version': '1.0' },
    },
    spec: {
      title: 'PHP', frontendUrl: '/assets/php/', backendUrl: '/php-api',
      bindings: [{ name: 'founder', support: 'thirdparty_cd', menu: [
        { title: 'PHP versions', do: '#/versions', is_default: 1 },
        { title: 'Settings', do: '#/settings' },
      ] }],
    },
  };
}

function harness({ routeName = 'dialog-micro', query = {}, props = {}, startApp } = {}) {
  const resource = microApp();
  const requests = [], starts = [], destroys = [];
  const appStore = { topApps: [], hideMenu: false, menu: true, topMenu: false, device: 'desktop' };
  const loadingStore = { loading: false };
  const bus = { $on() {}, $off() {}, $emit() {} };
  const panelApi = {
    async get(url) {
      requests.push(url);
      if (/\/microapp\/[^/]+\/info$/.test(url)) return { data: resource };
      if (/\/static\/.+\/status$/.test(url)) return { data: { status: 'ready' } };
      return { data: {} };
    },
    async post(url) { requests.push(url); return { data: {} }; },
  };
  const k8sproxy = {
    async get(url) {
      requests.push(url);
      assert(!url.includes('/appgroups'), `MicroApp initialization requested AppGroup API: ${url}`);
      assert(url.includes('/microapps'), `Unexpected K8s API: ${url}`);
      const selector = new URL(url, 'http://panel.test').searchParams.get('labelSelector') || '';
      return { data: selector.startsWith('w7.cc/depends-') ? { items: [] } : { items: [resource] } };
    },
  };
  const emptyFactory = () => ({});
  const imports = {
    '@/utils/api': { panelApi, k8sproxy },
    '@/store': {
      useAppStore: () => appStore,
      useNamespaceStore: () => ({ namespace: 'default' }),
      useLoadingStore: () => loadingStore,
    },
    '@/utils/auth': {
      getPermission: () => [], getFileEditor: () => 'false', getToken: () => 'test-panel-token',
      getK8sinfo: () => ({ 'w7.cc/role': 'founder' }),
    },
    wujie: {
      bus,
      destroyApp(name) { destroys.push(name); },
      async startApp(options) {
        starts.push(options);
        if (startApp) return startApp(options);
        return () => { destroys.push(options.name); };
      },
    },
    '@/utils/wujie-modal-handles': { appendWujieModalHandles() {} },
    '@/utils/wujie-proxy-request': {
      appendWujieProxyRequestQuery: url => url,
      getWujieProxyBackendUrl: url => url,
    },
    '@/utils/wujie-require-plugin': { createWujieRequirePlugin: emptyFactory },
    '@/utils/wujie-request-credentials-plugin': { createWujieRequestCredentialsPlugin: emptyFactory },
    '@/utils/wujie-cors-fetch': { wujieFetch() {} },
    '@/utils/microapp-proxy': {
      createK8sProxy: emptyFactory, createMicroappProxy: emptyFactory, createPanelProxy: emptyFactory,
    },
    '@/utils/ckm-panel-session': { createOpenCkmPanel: emptyFactory },
    '@/utils/running-first-pod': { runningFirstPod() {} },
    '@/utils/pod-shell': { podShell() {} },
    '@/utils/app-dynamic-values': {
      createAppDynamicValuesGetter: emptyFactory,
      createAppValidator: emptyFactory,
      checkAppAvailability() {},
    },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const source = fs.readFileSync(filename, 'utf8');
    const script = filename.endsWith('.vue') ? source.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/)[1] : source;
    const code = ts.transpileModule(script, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    cache.set(filename, exports);
    vm.runInNewContext(code, {
      exports,
      require(name) {
        if (imports[name]) return imports[name];
        if (name.endsWith('.vue')) return { __esModule: true, default: { name } };
        const local = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
        if (fs.existsSync(`${local}.ts`)) return load(`${local}.ts`);
        throw new Error(`Unmocked import: ${name}`);
      },
      crypto, URL, URLSearchParams, setTimeout, clearTimeout, clearInterval,
      btoa: input => Buffer.from(input).toString('base64'),
      console: { log() {}, warn() {} },
      window: { location: { origin: 'http://panel.test' }, addEventListener() {}, removeEventListener() {} },
    }, { filename });
    return exports;
  }
  const component = load(detailPath).default;
  const route = { name: routeName, params: { group: 'w7-php' }, meta: {}, query: { ...query } };
  const ctx = {
    ...component.data(), ...component.setup(),
    embeddedMicro: false, group: undefined, do: undefined, showMenu: undefined, ...props,
    namespaceActive: 'default', userRole: 'founder',
    $route: route,
    $refs: { microContainer: { querySelector() { return null; } } },
    $nextTick: fn => Promise.resolve().then(fn),
    $router: {
      async replace(target) { if (target.query) route.query = { ...target.query }; },
      async push() {},
    },
  };
  for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx);
  for (const [name, computed] of Object.entries(component.computed)) {
    Object.defineProperty(ctx, name, {
      configurable: true,
      get: (typeof computed === 'function' ? computed : computed.get).bind(ctx),
    });
  }
  ctx.hideAppMenu = ctx.isHideMenu();
  return { ctx, component, requests, starts, destroys, loadingStore, load };
}

function elements(template, predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    for (const child of node.children || []) visit(child);
  }
  visit(parse(template));
  return matches;
}

function renders(node, ctx) {
  const condition = node.props.find(prop => prop.type === 7 && prop.name === 'if');
  return !condition || vm.runInNewContext(condition.exp.content, ctx);
}

test('dialog routing and legacy wrapper both resolve the shared detail component', async () => {
  const { load } = harness();
  const routes = load(path.join(root, 'src/router/routes/modules/dialogpage.ts')).default;
  const route = routes.find(item => item.name === 'dialog-micro');
  const loaded = await route.component();
  assert.equal(loaded.default.name, '@/views/app/apps/detail.vue');
  const wrapper = fs.readFileSync(path.join(root, 'src/views/topapp/micro.vue'), 'utf8');
  const detail = elements(wrapper.match(/<template>([\s\S]*?)<\/template>/)[1], node => node.type === 1 && /detail/i.test(node.tag))[0];
  assert(detail, 'the legacy component must render the shared detail component');
  for (const prop of ['group', 'do', 'show-menu']) {
    assert(detail.props.some(binding => binding.type === 7 && binding.name === 'bind' && binding.arg.content === prop), `wrapper must forward ${prop}`);
  }
  assert(detail.props.some(prop => (prop.name === 'embedded-micro') || prop.arg?.content === 'embedded-micro'));
});

test('dialog fills its container without an app menu or breadcrumb', () => {
  const { ctx } = harness({ query: { showMenu: 'true' } });
  assert.equal(ctx.isMicroPage, true);
  assert.equal(ctx.hideAppMenu, true, 'dialog mode must override a showMenu query');
  assert.equal(ctx.appDetailMainStyle.padding, '0');
  const template = parseSfc(detailSource).descriptor.template.content;
  const breadcrumb = elements(template, node => node.type === 1 && node.tag === 'Breadcrumb')[0];
  const menu = elements(template, node => node.type === 1 && node.tag === 'component')[0];
  assert.equal(renders(breadcrumb, ctx), false);
  assert.equal(renders(menu, ctx), false);
});

test('dialog starts an unknown dynamic do route and retains paneltoken', async () => {
  const { ctx, starts } = harness({ query: { do: dynamicRoute, paneltoken: 'test-panel-token' } });
  await ctx.getData();
  assert.equal(starts.length, 1);
  assert.equal(starts[0].url, `/assets/php/${dynamicRoute}`);
  assert.equal(ctx.menuActive, dynamicRoute, 'the default menu must not replace a dynamic child route');
  assert.equal(ctx.$route.query.do, dynamicRoute);
  assert.equal(ctx.$route.query.paneltoken, 'test-panel-token');
  assert.equal(starts[0].props.paneltoken, 'test-panel-token');
  assert.equal(starts[0].props.appgroup, 'w7-php');
});

test('initializing dialog and embedded entries only reads MicroApp context', async () => {
  for (const options of [
    { routeName: 'dialog-micro', query: { do: dynamicRoute } },
    { routeName: 'cloud-resource', props: { embeddedMicro: true, group: 'w7-php', do: dynamicRoute, showMenu: false } },
  ]) {
    const { ctx, starts, requests } = harness(options);
    if (ctx.embeddedMicro) ctx.$route.params.group = 'unrelated-route-group';
    await ctx.getData();
    assert.equal(starts.length, 1);
    assert.equal(ctx.entryGroup, 'w7-php');
    assert.equal(ctx.activeMicroAppName, 'w7-php');
    assert(requests.some(url => url.includes('/microapp/w7-php/info')));
    assert(requests.some(url => url.includes('/microapps')));
    assert(requests.every(url => !url.includes('/appgroups')));
    assert.equal(ctx.watchInterval, null, 'standalone entries must not start AppGroup workload polling');
  }
});

test('embedded props control the route and layout while ordinary detail keeps its layout', () => {
  const { ctx: embedded } = harness({
    routeName: 'cloud-resource', query: { do: '#/query-route' },
    props: { embeddedMicro: true, group: 'embedded-group', do: dynamicRoute, showMenu: false },
  });
  assert.equal(embedded.isMicroPage, true);
  assert.equal(embedded.entryGroup, 'embedded-group');
  assert.equal(embedded.getRequestedMicroRoute(), dynamicRoute);
  assert.equal(embedded.hideAppMenu, true);
  assert.equal(embedded.appDetailMainStyle.padding, '0');
  const { ctx: ordinary } = harness({ routeName: 'app-detail-detail' });
  assert.equal(ordinary.isMicroEntry, false);
  assert.equal(ordinary.isMicroPage, false);
  assert.equal(ordinary.hideAppMenu, false);
  assert.equal(ordinary.appDetailMainStyle.padding, '20px');
  const { ctx: groupMicro } = harness({ routeName: 'group-micro', query: { paneltoken: 'keep' } });
  assert.equal(groupMicro.isMicroPage, true);
  const query = groupMicro.getMicroRouteQuery(dynamicRoute, 'w7-php');
  assert.equal(query['app-detail-micro'], dynamicRoute);
  assert.equal(query.paneltoken, 'keep');
});

test('later unknown child routes navigate directly and empty entry routes use the default menu', async () => {
  const { ctx, starts } = harness();
  await ctx.getData();
  assert.equal(ctx.menuActive, '#/versions');
  const nextStart = new Promise(resolve => {
    ctx.wujieInit = () => { resolve(); };
  });
  ctx.syncRequestedMicroRoute(dynamicRoute, true);
  await nextStart;
  assert.equal(ctx.menuActive, dynamicRoute);
  assert.equal(starts.length, 1);
});

test('child navigation updates do and paneltoken without restarting the micro app', async () => {
  const { ctx, component, starts } = harness({ query: { paneltoken: 'keep-child-token' } });
  await ctx.getData();
  let reinitializations = 0;
  const init = ctx.wujieInit;
  ctx.wujieInit = (...args) => { reinitializations++; return init(...args); };

  ctx.syncMicroRouteFromChild(dynamicRoute, 'w7-php');
  // Vue invokes these watchers after the child route is written to the host URL.
  component.watch['$route.query.do'].call(ctx, ctx.$route.query.do);
  component.watch['$route.query.microapp'].call(ctx, ctx.$route.query.microapp);
  await ctx.wujieInitPromise;

  assert.equal(ctx.menuActive, dynamicRoute);
  assert.equal(ctx.$route.query.do, dynamicRoute);
  assert.equal(ctx.$route.query.paneltoken, 'keep-child-token');
  assert.equal(reinitializations, 0, 'query synchronization must not reload an already navigated child');
  assert.equal(starts.length, 1);
});

test('concurrent detail instances have isolated Wujie names and containers', async () => {
  const first = harness({ query: { do: dynamicRoute } });
  const second = harness({ query: { do: dynamicRoute } });
  await Promise.all([first.ctx.getData(), second.ctx.getData()]);
  assert.notEqual(first.starts[0].name, second.starts[0].name);
  assert.equal(first.starts[0].el, first.ctx.$refs.microContainer);
  assert.equal(second.starts[0].el, second.ctx.$refs.microContainer);
  await first.ctx.destroyWujieApp();
  assert.equal(first.destroys.length, 1);
  assert.equal(second.destroys.length, 0);
  assert.equal(typeof second.ctx.wujieDestroy, 'function');
});

test('closing a dialog destroys a late Wujie startup without retaining its handle', async () => {
  let finishStart, markStarted, destroyed = 0;
  const started = new Promise(resolve => { markStarted = resolve; });
  const { ctx, component } = harness({
    query: { do: dynamicRoute },
    startApp: () => {
      markStarted();
      return new Promise(resolve => { finishStart = resolve; });
    },
  });
  const loading = ctx.getData();
  await started;
  component.beforeUnmount.call(ctx);
  finishStart(() => { destroyed++; });
  await loading;
  assert.equal(ctx.microDisposed, true);
  assert.equal(destroyed, 1);
  assert.equal(ctx.wujieDestroy, null);
});

test('a failed Wujie startup cleans up only its own runtime by name', async () => {
  const { ctx, starts, destroys } = harness({
    query: { do: dynamicRoute },
    startApp: async () => { throw new Error('frontend startup failed'); },
  });
  await ctx.getData();
  assert.equal(starts.length, 1);
  assert.equal(destroys.length, 1);
  assert.equal(destroys[0], starts[0].name);
  assert.equal(ctx.wujieDestroy, null);
});

test('micro entries use local loading throughout startup and leave global loading untouched', async () => {
  for (const entry of [
    { routeName: 'topapp-micro' },
    { routeName: 'dialog-micro' },
    { routeName: 'cloud-resource', props: { embeddedMicro: true, group: 'w7-php' } },
  ]) {
    for (const globalLoading of [false, true]) {
      for (const fail of [false, true]) {
        let finishStart, markStarted;
        const started = new Promise(resolve => { markStarted = resolve; });
        const { ctx, loadingStore } = harness({
          ...entry,
          startApp: () => {
            markStarted();
            return new Promise((resolve, reject) => {
              finishStart = () => fail ? reject(new Error('startup failed')) : resolve(() => {});
            });
          },
        });
        loadingStore.loading = globalLoading;
        const request = ctx.getData();
        await started;
        assert.equal(ctx.microLoading, true, 'the local placeholder must cover pending startup');
        assert.equal(loadingStore.loading, globalLoading, 'micro startup must not enable global loading');
        finishStart();
        await request;
        assert.equal(ctx.microLoading, false, 'success and failure must both release local loading');
        assert.equal(loadingStore.loading, globalLoading, 'micro startup must not clear another operation\'s loading');
      }
    }
  }
});

test('native app entries retain global loading on success and failure', async () => {
  for (const fail of [false, true]) {
    const { ctx, loadingStore } = harness({ routeName: 'topapp-direct' });
    let finishLoad;
    ctx.getTopAppData = () => new Promise((resolve, reject) => {
      finishLoad = () => fail ? reject(new Error('entry failed')) : resolve();
    });
    const request = ctx.getData();
    assert.equal(loadingStore.loading, true);
    assert.equal(ctx.microLoading, false);
    finishLoad();
    if (fail) {
      await assert.rejects(request, /entry failed/);
    } else {
      await request;
    }
    assert.equal(loadingStore.loading, false);
  }
});
