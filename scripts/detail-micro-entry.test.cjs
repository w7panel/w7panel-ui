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

function harness({ routeName = 'dialog-micro', query = {}, props = {}, startApp,
  resource = microApp(), targets = {}, role = 'founder', panelGet, reactiveRoute = false } = {}) {
  const requests = [], starts = [], destroys = [], navigations = [], events = [], messages = [];
  const auth = { role, token: 'test-panel-token' };
  const appStore = { topApps: [], hideMenu: false, menu: true, topMenu: false, device: 'desktop' };
  const loadingStore = { loading: false };
  const bus = { $on() {}, $off() {}, $emit(...args) { events.push(args); } };
  const panelApi = {
    async get(url, options) {
      requests.push(url);
      if (panelGet) {
        const response = await panelGet(url, options);
        if (response !== undefined) return response;
      }
      if (/\/microapp\/[^/]+\/info$/.test(url)) {
        const name = decodeURIComponent(url.split('/')[2]);
        if (name === 'w7-php') return { data: resource };
        if (!targets[name]) throw new Error('目标应用不存在');
        return { data: await (typeof targets[name] === 'function' ? targets[name]() : targets[name]) };
      }
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
      getPermission: () => [], getFileEditor: () => 'false', getToken: () => auth.token,
      getK8sinfo: () => ({ 'w7.cc/role': auth.role }),
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
  const initialRoute = { name: routeName, params: { group: 'w7-php' }, meta: {}, query: { ...query } };
  const route = reactiveRoute ? require('vue').reactive(initialRoute) : initialRoute;
  const ctx = {
    ...component.data(), ...component.setup(),
    embeddedMicro: false, group: undefined, do: undefined, showMenu: undefined, ...props,
    namespaceActive: 'default', userRole: role,
    $route: route,
    $refs: { microContainer: { querySelector() { return null; } } },
    $message: { error(message) { messages.push(message); } },
    $nextTick: fn => Promise.resolve().then(fn),
    $router: {
      async replace(target) {
        navigations.push({ method: 'replace', ...target });
        if (target.query) route.query = { ...target.query };
      },
      async push(target) {
        navigations.push({ method: 'push', ...target });
        if (target.query) route.query = { ...target.query };
      },
    },
  };
  for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx);
  for (const [name, computed] of Object.entries(component.computed)) {
    Object.defineProperty(ctx, name, {
      configurable: true,
      get: (typeof computed === 'function' ? computed : computed.get).bind(ctx),
    });
  }
  let stopWatchers = () => {};
  if (reactiveRoute) {
    const { effectScope, watch } = require('vue');
    const scope = effectScope();
    scope.run(() => {
      for (const queryName of ['do', 'app-detail-micro', 'microapp', 'appmicro']) {
        watch(() => route.query[queryName], value => component.watch[`$route.query.${queryName}`].call(ctx, value));
      }
    });
    stopWatchers = () => scope.stop();
  }
  ctx.hideAppMenu = ctx.isHideMenu();
  return { ctx, component, requests, starts, destroys, loadingStore, load, navigations, events, messages, auth, stopWatchers };
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

const borrowedDo = 'app:w7panel-ckm#/upgrade-versions';

function borrowedSource({ role = 'founder', defaultMenu = true, onlyBorrowed = false } = {}) {
  const resource = microApp();
  const menu = { title: '版本升级', do: borrowedDo, location: 'back', is_default: defaultMenu ? 1 : 0 };
  resource.spec.bindings = [{ name: role, support: 'thirdparty_cd', menu: onlyBorrowed ? [menu] : [
    { title: '首页', do: '#/versions', is_default: defaultMenu ? 0 : 1 }, menu,
  ] }];
  return resource;
}

function ckmMicroApp() {
  return {
    metadata: {
      name: 'w7panel-ckm-root', namespace: 'default',
      labels: {
        'w7.cc/group-name': 'w7panel-ckm', 'w7.cc/identifie': 'ckm',
        'w7.cc/version': '2.0', 'microapp.w7.cc/from': 'root',
      },
    },
    spec: {
      title: 'CKM', frontendUrl: '/assets/ckm/', backendUrl: '/ckm-proxy',
      bindings: [{ name: 'founder', support: 'thirdparty_cd', menu: [
        { title: '升级', do: '#/upgrade-versions' },
        { title: '集群', do: '#/ckm' },
      ] }],
      'config-v2': { props: { roleConfig: {
        founder: { frontend_props: { providerOnly: 'ckm' } },
      } } },
    },
  };
}

function childNavigation(start) {
  const listeners = {};
  const initialUrl = new URL(start.url, 'http://panel.test');
  const child = {
    location: { pathname: initialUrl.pathname, search: initialUrl.search, hash: initialUrl.hash },
    history: { pushState() {}, replaceState() {} },
    addEventListener(name, handler) { listeners[name] = handler; },
  };
  start.plugins.find(plugin => plugin.windowPropertyOverride).windowPropertyOverride(child);
  return async (hash) => {
    child.location.hash = hash;
    listeners.hashchange();
    await Promise.resolve();
    await Promise.resolve();
  };
}

test('app menu parser preserves route encoding and rejects malformed references', () => {
  const { load } = harness();
  const { parseAppMenuDo, getAppMenuMatchScore } = load(path.join(root, 'src/utils/microapp-menu.ts'));
  const encoded = `${borrowedDo}?filter=a%2Fb%26c%3D1`;
  const parsed = parseAppMenuDo(encoded);
  assert.equal(parsed.appRef, 'w7panel-ckm');
  assert.equal(parsed.route, '#/upgrade-versions?filter=a%2Fb%26c%3D1');
  assert.equal(parseAppMenuDo('#/versions'), null);
  assert.equal(parseAppMenuDo('https://example.test/#/versions'), null);
  for (const invalid of ['app:', 'app:#/versions', 'app:ckm', 'app:ckm#versions', 'app:../ckm#/versions', 'app:ckm#/a\nb']) {
    assert.throws(() => parseAppMenuDo(invalid), /格式错误/);
  }
  assert(getAppMenuMatchScore(borrowedDo, `${borrowedDo}/v1/edit`) > 0);
  assert.equal(getAppMenuMatchScore(borrowedDo, 'app:w7panel-ckm#/upgrade-versions-old'), -1);
  assert.equal(getAppMenuMatchScore(borrowedDo, 'app:another#/upgrade-versions'), -1);
});

test('a default borrowed menu starts only the provider and stores the entire target in do', async () => {
  const resource = borrowedSource({ onlyBorrowed: true });
  delete resource.spec.frontendUrl;
  const { ctx, starts, requests } = harness({
    resource, targets: { 'w7panel-ckm': ckmMicroApp() },
    query: { paneltoken: 'keep-token', microapp: 'old-provider' },
  });
  await ctx.getData();
  assert.equal(starts.length, 1);
  assert.equal(starts[0].url, '/assets/ckm/#/upgrade-versions');
  assert.equal(starts[0].props.url, '/ckm-proxy');
  assert.equal(starts[0].props.providerOnly, 'ckm');
  assert.equal(starts[0].props.microappName, 'w7panel-ckm-root');
  assert.equal(starts[0].props.appgroup, 'w7panel-ckm');
  assert.equal(ctx.entryGroup, 'w7-php');
  assert.equal(ctx.microAppGroup, 'w7-php');
  assert.equal(ctx.microApps.length, 1, 'provider menus must not be merged into the source');
  assert.equal(ctx.roles[0].menus[0].microAppName, 'w7-php');
  assert.equal(ctx.menuActive, borrowedDo);
  assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}`);
  assert.deepEqual(Object.keys(ctx.$route.query).sort(), ['do', 'paneltoken']);
  assert.equal(ctx.$route.query.do, borrowedDo);
  assert(requests.includes('/microapp/w7panel-ckm-root/frontprops'));
  assert(requests.includes('/static/ckm/status'));
  assert(requests.every(url => !url.includes('/appgroups')));
});

test('top, dialog, embedded and group entries restore borrowed child pages from complete do', async () => {
  const route = `${borrowedDo}/version-1/edit?filter=a%2Fb%26c`;
  for (const entry of [
    { routeName: 'topapp-micro' },
    { routeName: 'dialog-micro' },
    { routeName: 'cloud-resource', props: { embeddedMicro: true, group: 'w7-php', do: route } },
    { routeName: 'group-micro' },
  ]) {
    const { ctx, starts } = harness({
      ...entry, resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() },
      query: { do: route, paneltoken: 'keep' },
    });
    if (entry.routeName === 'group-micro') {
      ctx.microAppGroup = 'w7-php';
      await ctx.getFront([borrowedSource()]);
    } else {
      await ctx.getData();
    }
    assert.equal(starts.length, 1);
    assert.equal(starts[0].url, '/assets/ckm/#/upgrade-versions/version-1/edit?filter=a%2Fb%26c');
    assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}`);
    assert.equal(ctx.$route.query.do, route);
    assert.equal(ctx.$route.query.paneltoken, 'keep');
    assert.equal(ctx.$route.query.microapp, undefined);
    assert.equal(ctx.$route.query['app-detail-micro'], undefined);
  }
});

test('legacy borrowed route queries normalize to a single do value', async () => {
  for (const query of [
    { 'app-detail-micro': borrowedDo, microapp: 'w7panel-ckm-root' },
    { 'app-detail-micro': borrowedDo, do: '#/settings', microapp: 'w7panel-ckm-root' },
    { appmicro: encodeURIComponent(borrowedDo), microapp: 'w7panel-ckm-root' },
    { do: borrowedDo, 'app-detail-micro': '__topapp_app_direct__', microapp: 'w7panel-ckm-root' },
    { do: [borrowedDo, '#/settings'], 'app-detail-micro': '__topapp_app_direct__' },
  ]) {
    const { ctx, starts } = harness({ resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() }, query });
    await ctx.getData();
    assert.equal(starts.length, 1);
    assert.equal(ctx.$route.query.do, borrowedDo);
    assert.deepEqual(Object.keys(ctx.$route.query), ['do']);
  }
});

test('top-app routing gives a borrowed do priority over legacy direct-page parameters', () => {
  const { load } = harness();
  const routes = load(path.join(root, 'src/router/routes/modules/wujie.ts')).default;
  const top = routes.find(route => route.name === 'topapp');
  const route = { params: { group: 'w7-php' }, query: { do: borrowedDo, 'app-detail-micro': '__topapp_app_direct__' } };
  assert.equal(top.redirect(route).name, 'topapp-micro');
  assert.equal(top.children.find(child => child.name === 'topapp-micro').beforeEnter(route), undefined);
});

test('ordinary routes keep legacy query priority across micro entry points', async () => {
  for (const routeName of ['dialog-micro', 'topapp-micro', 'group-micro']) {
    for (const query of [
      { 'app-detail-micro': '#/versions', do: '#/settings', appmicro: '#/other' },
      { 'app-detail-micro': ['#/versions', '#/other'], do: ['#/settings', '#/other'] },
    ]) {
      const { ctx, starts } = harness({ routeName, query });
      assert.equal(ctx.getRequestedMicroRoute(), '#/versions');
      if (routeName === 'group-micro') {
        ctx.microAppGroup = 'w7-php';
        await ctx.getFront([microApp()]);
      } else {
        await ctx.getData();
      }
      assert.equal(starts.length, 1);
      assert.equal(starts[0].url, '/assets/php/#/versions');
      assert.equal(ctx.menuActive, '#/versions');
      assert.equal(ctx.$route.query.appmicro, undefined);
      assert.equal(ctx.$route.query[routeName === 'group-micro' ? 'app-detail-micro' : 'do'], '#/versions');
    }
  }
  const { ctx } = harness({
    props: { embeddedMicro: true, group: 'w7-php', do: '#/from-prop' },
    query: { do: borrowedDo, 'app-detail-micro': '#/versions' },
  });
  assert.equal(ctx.getRequestedMicroRoute(), '#/from-prop', 'explicit embedded props retain highest priority');
});

test('legacy direct-page routing keeps priority over an ordinary do', async () => {
  const query = {
    'app-detail-micro': '__topapp_app_direct__', do: '#/settings', appmicro: '#/versions', showMenu: 'false', paneltoken: 'keep',
  };
  const { ctx, load, starts, navigations } = harness({ routeName: 'topapp-micro', query });
  const top = load(path.join(root, 'src/router/routes/modules/wujie.ts')).default.find(route => route.name === 'topapp');
  const route = { params: { group: 'w7-php' }, query };
  for (const redirect of [top.redirect(route), top.children.find(child => child.name === 'topapp-micro').beforeEnter(route)]) {
    assert.equal(redirect.name, 'topapp-direct');
    assert.deepEqual(Object.keys(redirect.query), ['paneltoken']);
    assert.equal(redirect.query.paneltoken, 'keep');
  }
  assert.equal(ctx.getRequestedMicroRoute(), '__topapp_app_direct__');
  await ctx.getData();
  assert.equal(starts.length, 0);
  assert.equal(navigations.at(-1).name, 'topapp-direct');
  const reverse = { params: route.params, query: { 'app-detail-micro': '#/versions', do: '__topapp_app_direct__' } };
  assert.equal(top.redirect(reverse).name, 'topapp-micro');
  assert.equal(top.children.find(child => child.name === 'topapp-micro').beforeEnter(reverse), undefined);
});

test('query watchers apply the same priority to conflicting ordinary and borrowed routes', async () => {
  const { nextTick } = require('vue');
  const { ctx, starts, events, navigations, stopWatchers } = harness({
    resource: borrowedSource({ defaultMenu: false }), targets: { 'w7panel-ckm': ckmMicroApp() }, reactiveRoute: true,
  });
  try {
    await ctx.getData();
    await nextTick();
    ctx.$route.query = { 'app-detail-micro': '#/versions', do: '#/settings' };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.menuActive, '#/versions');
    assert.equal(events.length, 0, 'changing a lower-priority ordinary do must not navigate the child');
    assert.equal(starts.length, 1);
    ctx.$route.query = { do: borrowedDo, 'app-detail-micro': '__topapp_app_direct__' };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    await ctx.wujieInitPromise;
    assert.equal(starts.length, 2);
    assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions');
    assert.equal(ctx.$route.query.do, borrowedDo);
    assert.equal(ctx.$route.query['app-detail-micro'], undefined);
    assert(navigations.every(target => target.name !== 'topapp-direct'));
  } finally {
    stopWatchers();
  }
});

test('child navigation keeps the provider prefix, encoded query and source highlight without reloading', async () => {
  const { ctx, component, starts } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() }, query: { paneltoken: 'keep' },
  });
  await ctx.getData();
  const navigate = childNavigation(starts[0]);
  await navigate('#/upgrade-versions/version-1/executions?filter=a%2Fb%26c');
  await component.watch['$route.query.do'].call(ctx, ctx.$route.query.do);
  await component.watch['$route.query.microapp'].call(ctx);
  assert.equal(ctx.$route.query.do, `${borrowedDo}/version-1/executions?filter=a%2Fb%26c`);
  assert.equal(ctx.$route.query.paneltoken, 'keep');
  assert.equal(ctx.$route.query.microapp, undefined);
  assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}`);
  assert.equal(starts.length, 1);
});

test('same-provider menu clicks use push and keep the running child route plugin active', async () => {
  const resource = borrowedSource();
  resource.spec.bindings[0].menu.push({ title: '集群', do: 'app:w7panel-ckm#/ckm' });
  const { ctx, starts, events, navigations, requests } = harness({ resource, targets: { 'w7panel-ckm': ckmMicroApp() } });
  await ctx.getData();
  const navigate = childNavigation(starts[0]);
  await ctx.handelMicroMenu('w7-php:app:w7panel-ckm#/ckm');
  assert.equal(starts.length, 1);
  assert.equal(navigations.at(-1).method, 'push');
  assert.equal(events.at(-1)[0], 'routeChange');
  assert.equal(events.at(-1)[1], '/ckm');
  await navigate('#/ckm/child');
  assert.equal(ctx.$route.query.do, 'app:w7panel-ckm#/ckm/child');
  assert.equal(ctx.selectMenu[0], 'w7-php:app:w7panel-ckm#/ckm');
  assert.equal(requests.filter(url => url === '/microapp/w7panel-ckm/info').length, 1);
});

test('legacy appmicro synchronization keeps local and borrowed child route callbacks active', async () => {
  const { nextTick } = require('vue');
  for (const borrowed of [false, true]) {
    const { ctx, starts, stopWatchers } = harness({
      resource: borrowed ? borrowedSource() : microApp(),
      targets: { 'w7panel-ckm': ckmMicroApp() }, reactiveRoute: true,
    });
    try {
      await ctx.getData();
      const navigate = childNavigation(starts[0]);
      ctx.$route.query.appmicro = borrowed ? 'app:w7panel-ckm#/ckm' : '#/settings';
      await nextTick();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(starts.length, 1, 'synchronization must keep the running instance');
      await navigate(borrowed ? '#/ckm/child' : '#/settings/child');
      await nextTick();
      assert.equal(ctx.$route.query.do, borrowed ? 'app:w7panel-ckm#/ckm/child' : '#/settings/child');
      assert.equal(ctx.$route.query.appmicro, undefined);
      assert.equal(starts.length, 1);
    } finally {
      stopWatchers();
    }
  }
});

test('legacy synchronization during startup does not cancel the pending runtime', async () => {
  let finishStatus, markStatus;
  const statusStarted = new Promise(resolve => { markStatus = resolve; });
  const { ctx, component, starts } = harness({
    panelGet: url => {
      if (url === '/static/w7-php/status') {
        markStatus();
        return new Promise(resolve => { finishStatus = resolve; });
      }
    },
  });
  const initial = ctx.getData();
  await statusStarted;
  ctx.$route.query.appmicro = '#/settings';
  await component.watch['$route.query.appmicro'].call(ctx, '#/settings');
  finishStatus({ data: { status: 'ready' } });
  await initial;
  assert.equal(starts.length, 1);
  assert.equal(starts[0].url, '/assets/php/#/settings');
  await childNavigation(starts[0])('#/settings/child');
  assert.equal(ctx.$route.query.do, '#/settings/child');
  assert.equal(ctx.microLoading, false);
});

test('returning from an external page to a borrowed menu reloads the same provider frontend', async () => {
  const resource = microApp();
  const reference = 'app:w7-php#/versions';
  resource.spec.bindings[0].menu.push({ title: '借用版本', do: reference }, { title: '外部页面', do: 'https://example.test/external' });
  const { ctx, starts, events } = harness({ resource });
  await ctx.getData();
  await ctx.handelMicroMenu(reference);
  await ctx.handelMicroMenu('https://example.test/external');
  await ctx.wujieInitPromise;
  assert.equal(starts.at(-1).url, 'https://example.test/external');
  const externalChild = childNavigation(starts.at(-1));
  const beforeReturn = starts.length;
  const previousEvents = events.length;
  await ctx.handelMicroMenu(reference);
  assert.equal(starts.length, beforeReturn + 1);
  assert.equal(starts.at(-1).url, '/assets/php/#/versions');
  assert.equal(events.length, previousEvents, 'an external page needs a reload instead of a route event');
  await externalChild('#/stale');
  assert.equal(ctx.$route.query.do, reference);
  await childNavigation(starts.at(-1))('#/versions/child');
  assert.equal(ctx.$route.query.do, `${reference}/child`);
});

test('switching back to a local menu restores source configuration and browser history restores borrowing', async () => {
  const { ctx, starts, navigations } = harness({ resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() } });
  await ctx.getData();
  const oldChild = childNavigation(starts[0]);
  await ctx.handelMicroMenu('w7-php:#/versions');
  await ctx.wujieInitPromise;
  assert.equal(starts.at(-1).url, '/assets/php/#/versions');
  assert.equal(ctx.borrowedBindingName, '');
  assert.equal(ctx.info.providerOnly, undefined);
  assert.equal(navigations.at(-1).method, 'push');
  const localDo = ctx.$route.query.do;
  await oldChild('#/upgrade-versions/stale/edit');
  assert.equal(ctx.$route.query.do, localDo, 'old runtime callbacks must not change the current route');
  ctx.$route.query = { do: `${borrowedDo}/version-1/edit` };
  await ctx.syncRequestedMicroRoute(ctx.$route.query.do, true);
  assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions/version-1/edit');
  assert.equal(ctx.$route.query.microapp, undefined);
});

test('failed borrowed history restoration shows an error for the requested route and supports retry', async () => {
  const { nextTick } = require('vue');
  for (const denied of [false, true]) {
    const targets = denied ? { 'w7panel-ckm': ckmMicroApp() } : {};
    const { ctx, starts, destroys, messages, stopWatchers } = harness({
      resource: borrowedSource({ defaultMenu: false, role: denied ? 'normal' : 'founder' }),
      role: denied ? 'normal' : 'founder', targets, reactiveRoute: true,
    });
    try {
      await ctx.getData();
      const oldChild = childNavigation(starts[0]);
      ctx.$route.query = { do: borrowedDo, paneltoken: 'keep' };
      await nextTick();
      await new Promise(resolve => setImmediate(resolve));
      assert.match(ctx.microError, denied ? /无权访问/ : /目标应用不存在/);
      assert.equal(ctx.menuActive, borrowedDo);
      assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}`);
      assert.equal(ctx.microRetryDo, borrowedDo);
      assert.equal(ctx.microRuntimeStarted, false);
      assert.equal(ctx.microLoading, false);
      assert(destroys.length > 0, 'the old application must not remain displayed at the requested URL');
      assert.equal(messages.length, 0);
      await oldChild('#/versions/stale');
      assert.equal(ctx.$route.query.do, borrowedDo);
      if (denied) {
        targets['w7panel-ckm'].spec.bindings.push({ name: 'normal', support: 'thirdparty_cd', menu: [{ do: '#/upgrade-versions' }] });
      } else {
        targets['w7panel-ckm'] = ckmMicroApp();
      }
      await ctx.retryMicroMenu();
      await nextTick();
      assert.equal(ctx.microError, '');
      assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions');
      assert.equal(ctx.$route.query.do, borrowedDo);
      assert.equal(ctx.$route.query.paneltoken, 'keep');
    } finally {
      stopWatchers();
    }
  }
});

test('provider initialization failure after a menu click replaces the old runtime with a retryable error', async () => {
  const { nextTick } = require('vue');
  for (const recovery of ['menu', 'retry']) {
    let statusFails = true;
    const { ctx, starts, destroys, messages, stopWatchers } = harness({
      resource: borrowedSource({ defaultMenu: false }), targets: { 'w7panel-ckm': ckmMicroApp() },
      reactiveRoute: true,
      panelGet: url => { if (statusFails && url === '/static/ckm/status') throw new Error('provider status unavailable'); },
    });
    try {
      await ctx.getData();
      const oldChild = childNavigation(starts[0]);
      await ctx.handelMicroMenu(borrowedDo);
      await nextTick();
      assert.match(ctx.microError, /provider status unavailable/);
      assert.equal(ctx.$route.query.do, borrowedDo);
      assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}`);
      assert.equal(ctx.microRetryDo, borrowedDo);
      assert.equal(ctx.microRuntimeStarted, false);
      assert.equal(ctx.microLoading, false);
      assert.equal(starts.length, 1);
      assert(destroys.length > 0, 'the previous application must not remain displayed at the provider URL');
      assert.equal(messages.length, 0);
      await oldChild('#/versions/stale');
      assert.equal(ctx.$route.query.do, borrowedDo);
      statusFails = false;
      if (recovery === 'menu') await ctx.handelMicroMenu(borrowedDo);
      else await ctx.retryMicroMenu();
      await nextTick();
      assert.equal(ctx.microError, '');
      assert.equal(starts.length, 2);
      assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions');
      await childNavigation(starts.at(-1))('#/upgrade-versions/v1/edit');
      await nextTick();
      assert.equal(ctx.$route.query.do, `${borrowedDo}/v1/edit`);
    } finally {
      stopWatchers();
    }
  }
});

test('borrowed history restoration and error recovery work without visible source menus', async () => {
  const { nextTick } = require('vue');
  const target = ckmMicroApp();
  target.spec.bindings.push({ name: 'normal', support: 'thirdparty_cd', menu: [{ do: '#/upgrade-versions' }] });
  const { ctx, starts, events, stopWatchers } = harness({
    resource: microApp(), role: 'normal', targets: { 'w7panel-ckm': target },
    query: { do: borrowedDo }, reactiveRoute: true,
  });
  try {
    await ctx.getData();
    await nextTick();
    assert.equal(ctx.roles.length, 0);
    assert.equal(starts.length, 1);
    assert.equal(ctx.microError, '');
    const oldChild = childNavigation(starts[0]);
    const restoredDo = `${borrowedDo}/v1/edit`;
    ctx.$route.query = { do: restoredDo };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.menuActive, restoredDo);
    assert.equal(ctx.selectMenu[0], restoredDo);
    assert.equal(events.at(-1)[1], '/upgrade-versions/v1/edit');
    assert.equal(starts.length, 1, 'history within the same provider should reuse its instance');
    const missingDo = 'app:unavailable#/upgrade-versions';
    ctx.$route.query = { do: missingDo };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(ctx.microError, /目标应用不存在/);
    assert.equal(ctx.menuActive, missingDo);
    await oldChild('#/upgrade-versions/stale');
    assert.equal(ctx.$route.query.do, missingDo);
    ctx.$route.query = { do: restoredDo };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    await ctx.wujieInitPromise;
    assert.equal(ctx.microError, '');
    assert.equal(starts.length, 2);
    assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions/v1/edit');
    await childNavigation(starts.at(-1))('#/upgrade-versions/v1/edit/details');
    await nextTick();
    assert.equal(ctx.$route.query.do, `${restoredDo}/details`);
  } finally {
    stopWatchers();
  }
});

test('nested borrowed menus keep source grouping and use the longest path match', async () => {
  const resource = borrowedSource();
  resource.spec.bindings[0].menu.unshift({ title: '管理', do: '#/management' });
  resource.spec.bindings[0].menu.find(menu => menu.do === borrowedDo).parent = '#/management';
  resource.spec.bindings[0].menu.push({ title: '执行记录', do: `${borrowedDo}/version-1/executions`, parent: '#/management' });
  const { ctx, starts } = harness({
    resource, targets: { 'w7panel-ckm': ckmMicroApp() },
    query: { do: `${borrowedDo}/version-1/executions/record-1` },
  });
  await ctx.getData();
  assert.equal(starts.length, 1);
  assert.equal(ctx.selectMenu[0], `w7-php:${borrowedDo}/version-1/executions`);
  assert.equal(ctx.roles[0].menus[0].children[0].microAppName, 'w7-php');
});

test('unconfigured borrowed references open directly, navigate and restore without a source menu', async () => {
  for (const entry of ['initial', 'navigate', 'history']) {
    const { ctx, starts } = harness({
      resource: microApp(), targets: { 'w7panel-ckm': ckmMicroApp() },
      query: entry === 'initial' ? { do: borrowedDo } : {},
    });
    await ctx.getData();
    if (entry === 'navigate') {
      assert.equal(ctx.navigateMicro(borrowedDo), true);
      await new Promise(resolve => setImmediate(resolve));
      await ctx.wujieInitPromise;
    } else if (entry === 'history') {
      ctx.$route.query = { do: borrowedDo };
      await ctx.syncRequestedMicroRoute(borrowedDo, true);
    }
    assert.equal(ctx.microError, '');
    assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions');
    assert.equal(ctx.selectMenu[0], borrowedDo);
    assert.equal(ctx.$route.query.do, borrowedDo);
    assert.equal(ctx.entryGroup, 'w7-php');
    assert.equal(ctx.microApps.length, 1);
    await childNavigation(starts.at(-1))('#/upgrade-versions/v1/edit');
    assert.equal(ctx.$route.query.do, `${borrowedDo}/v1/edit`);
    assert.equal(ctx.selectMenu[0], `${borrowedDo}/v1/edit`);
  }
});

test('invalid references and unavailable provider menus show a retryable error without starting', async () => {
  for (const options of [
    { resource: microApp(), query: { do: borrowedDo } },
    { resource: borrowedSource(), targets: {} },
    { resource: borrowedSource(), targets: { 'w7panel-ckm': { ...ckmMicroApp(), metadata: { name: 'deleted', deletionTimestamp: 'now' } } } },
    { resource: borrowedSource(), query: { do: 'app:w7panel-ckm' } },
  ]) {
    const { ctx, starts, loadingStore } = harness(options);
    await ctx.getData();
    assert.equal(starts.length, 0);
    assert(ctx.microError);
    assert.equal(ctx.microLoading, false);
    assert.equal(loadingStore.loading, false);
  }
});

test('normal users cannot borrow founder menus or fall back to founder runtime configuration', async () => {
  const target = ckmMicroApp();
  const unconfiguredSource = microApp();
  unconfiguredSource.spec.bindings[0].name = 'normal';
  for (const resource of [borrowedSource({ role: 'normal' }), unconfiguredSource]) {
    const denied = harness({ role: 'normal', resource, targets: { 'w7panel-ckm': target }, query: { do: borrowedDo } });
    await denied.ctx.getData();
    assert.equal(denied.starts.length, 0);
    assert.match(denied.ctx.microError, /无权访问/);
  }

  target.spec.bindings.push({ name: 'normal', support: 'thirdparty_cd', menu: [{ title: '升级', do: '#/upgrade-versions' }] });
  target.spec['config-v2'].props.roleConfig.founder.frontend_props.secret = 'founder-only';
  const allowed = harness({ role: 'normal', resource: borrowedSource({ role: 'normal' }), targets: { 'w7panel-ckm': target } });
  await allowed.ctx.getData();
  assert.equal(allowed.starts.length, 1);
  assert.equal(allowed.starts[0].props.secret, undefined);
  assert.equal(allowed.ctx.borrowedBindingName, 'normal');
});

test('provider menu references are not recursively expanded', async () => {
  const target = ckmMicroApp();
  target.spec.bindings[0].menu = [{ title: '循环引用', do: 'app:w7-php#/versions' }];
  const { ctx, starts, requests } = harness({ resource: borrowedSource(), targets: { 'w7panel-ckm': target } });
  await ctx.getData();
  assert.equal(starts.length, 0);
  assert.match(ctx.microError, /未开放/);
  assert.equal(requests.filter(url => url.endsWith('/info')).length, 2);
});

test('failed menu clicks retain the running page and can be retried after the provider becomes available', async () => {
  const targets = {};
  const { ctx, starts, messages } = harness({ resource: borrowedSource({ defaultMenu: false }), targets });
  await ctx.getData();
  const navigate = childNavigation(starts[0]);
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  assert.equal(starts.length, 1);
  assert.equal(ctx.menuActive, '#/versions');
  assert.equal(ctx.selectMenu[0], 'w7-php:#/versions');
  assert.equal(ctx.microError, '');
  assert.equal(messages.length, 1);
  await navigate('#/versions/child');
  assert.equal(ctx.$route.query.do, '#/versions/child', 'a failed click must not disable the retained runtime callbacks');
  targets['w7panel-ckm'] = ckmMicroApp();
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  assert.equal(starts.length, 2);
  assert.equal(ctx.menuActive, borrowedDo);

  const initial = harness({ resource: borrowedSource(), targets: {} });
  await initial.ctx.getData();
  initial.ctx.loadBorrowedMicroApp = async () => ckmMicroApp();
  await initial.ctx.retryMicroMenu();
  assert.equal(initial.starts.length, 1);
  assert.equal(initial.ctx.microError, '');
});

test('a late provider response cannot replace a newer local menu selection', async () => {
  let finishLookup, markLookup;
  const lookupStarted = new Promise(resolve => { markLookup = resolve; });
  const { ctx, starts } = harness({
    resource: borrowedSource(),
    targets: { 'w7panel-ckm': () => { markLookup(); return new Promise(resolve => { finishLookup = resolve; }); } },
  });
  const initial = ctx.getData();
  await lookupStarted;
  await ctx.handelMicroMenu('w7-php:#/versions');
  await ctx.wujieInitPromise;
  finishLookup(ckmMicroApp());
  await initial;
  assert.equal(starts.length, 1);
  assert.equal(starts[0].url, '/assets/php/#/versions');
  assert.equal(ctx.menuActive, '#/versions');
  assert.equal(ctx.microLoading, false);
});

test('a stale Wujie startup is destroyed before the newest menu starts', async () => {
  let finishStart, markStarted;
  const started = new Promise(resolve => { markStarted = resolve; });
  let lateDestroyed = 0;
  const { ctx, starts } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() },
    startApp: options => {
      if (options.url.startsWith('/assets/ckm/')) {
        markStarted();
        return new Promise(resolve => { finishStart = () => resolve(() => { lateDestroyed++; }); });
      }
      return () => {};
    },
  });
  const initial = ctx.getData();
  await started;
  await ctx.handelMicroMenu('w7-php:#/versions');
  finishStart();
  await initial;
  await ctx.wujieInitPromise;
  assert.equal(lateDestroyed, 1);
  assert.equal(starts.length, 2);
  assert.equal(starts.at(-1).url, '/assets/php/#/versions');
  assert.equal(ctx.microLoading, false);
});

test('closing an entry during borrowed target lookup prevents any startup', async () => {
  let finishLookup, markLookup;
  const lookupStarted = new Promise(resolve => { markLookup = resolve; });
  const { ctx, component, starts } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': () => {
      markLookup(); return new Promise(resolve => { finishLookup = resolve; });
    } },
  });
  const initial = ctx.getData();
  await lookupStarted;
  component.beforeUnmount.call(ctx);
  finishLookup(ckmMicroApp());
  await initial;
  assert.equal(starts.length, 0);
});

test('provider lookup caches are invalidated when the authenticated session changes', async () => {
  const { ctx, requests, auth, starts } = harness({ resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() } });
  await ctx.getData();
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  assert.equal(requests.filter(url => url === '/microapp/w7panel-ckm/info').length, 1);
  auth.token = 'new-session';
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  assert.equal(requests.filter(url => url === '/microapp/w7panel-ckm/info').length, 2);
  assert.equal(starts.at(-1).props.paneltoken, 'new-session');
});

test('a failed lookup after a session change still recreates the provider with the new credentials', async () => {
  const { nextTick } = require('vue');
  let lookupFails = false;
  const { ctx, auth, starts, requests, stopWatchers } = harness({
    resource: borrowedSource(), reactiveRoute: true,
    targets: { 'w7panel-ckm': () => {
      if (lookupFails) throw new Error('provider lookup unavailable');
      return ckmMicroApp();
    } },
  });
  try {
    await ctx.getData();
    await nextTick();
    const oldChild = childNavigation(starts[0]);
    auth.token = 'new-session';
    lookupFails = true;
    await ctx.handelMicroMenu(borrowedDo);
    await nextTick();
    assert.equal(starts.length, 1, 'a failed lookup must preserve the current page');
    assert.equal(ctx.microError, '');
    lookupFails = false;
    await ctx.handelMicroMenu(borrowedDo);
    await nextTick();
    assert.equal(starts.length, 2, 'lookup recovery must replace the instance from the old session');
    assert.equal(starts.at(-1).props.paneltoken, 'new-session');
    assert.equal(requests.filter(url => url === '/microapp/w7panel-ckm/info').length, 3);
    await oldChild('#/upgrade-versions/stale');
    assert.equal(ctx.$route.query.do, borrowedDo);
    await ctx.handelMicroMenu(borrowedDo);
    assert.equal(starts.length, 2, 'a successfully initialized instance should be reused within the same session');
    await childNavigation(starts.at(-1))('#/upgrade-versions/v1/edit');
    await nextTick();
    assert.equal(ctx.$route.query.do, `${borrowedDo}/v1/edit`);
  } finally {
    stopWatchers();
  }
});

test('navigateMicro keeps the complete borrowed dynamic route when restarting', async () => {
  const { ctx, starts } = harness({ resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() } });
  await ctx.getData();
  assert.equal(ctx.navigateMicro('#/upgrade-versions/v1/edit?filter=a%2Fb'), true);
  await new Promise(resolve => setImmediate(resolve));
  await ctx.wujieInitPromise;
  assert.equal(ctx.$route.query.do, `${borrowedDo}/v1/edit?filter=a%2Fb`);
  assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions/v1/edit?filter=a%2Fb');
});

test('borrowed iframe menus use the provider role URL and retain do across reloads', async () => {
  let finishReload, markReload, statusCount = 0;
  const reloadStarted = new Promise(resolve => { markReload = resolve; });
  const target = ckmMicroApp();
  Object.assign(target.spec['config-v2'].props.roleConfig.founder, {
    load_mode: 'iframe', serverUrl: 'https://ckm.example.test/index.html',
    proxy_request: { headers: { 'X-Provider': 'ckm' } },
  });
  const resource = borrowedSource();
  resource.spec.bindings[0].menu.push({ title: '集群', do: 'app:w7panel-ckm#/ckm' });
  const { ctx, starts } = harness({
    resource, targets: { 'w7panel-ckm': target },
    panelGet: url => {
      if (url === '/static/ckm/status' && ++statusCount === 2) {
        markReload();
        return new Promise(resolve => { finishReload = resolve; });
      }
    },
  });
  await ctx.getData();
  assert.equal(starts[0].degrade, true);
  assert.equal(starts[0].url, 'https://ckm.example.test/index.html#/upgrade-versions');
  assert.equal(starts[0].props.proxy_request.headers['X-Provider'], 'ckm');
  const oldChild = childNavigation(starts[0]);
  const switching = ctx.handelMicroMenu('w7-php:app:w7panel-ckm#/ckm');
  await reloadStarted;
  await oldChild('#/upgrade-versions/stale');
  assert.equal(ctx.$route.query.do, 'app:w7panel-ckm#/ckm', 'old iframe events must not overwrite a pending navigation');
  finishReload({ data: { status: 'ready' } });
  await switching;
  await ctx.wujieInitPromise;
  assert.equal(starts.at(-1).url, 'https://ckm.example.test/index.html#/ckm');
  assert.equal(ctx.$route.query.do, 'app:w7panel-ckm#/ckm');

  let returnedToBlank = false;
  const iframe = {
    get contentWindow() { throw new Error('cross-origin iframe'); },
    addEventListener(name, handler) { this.loaded = handler; },
    set src(value) { returnedToBlank = value === 'about:blank'; this.loaded(); },
  };
  ctx.$refs.microContainer.querySelector = () => iframe;
  await ctx.handelMicroMenu('w7-php:#/versions');
  await ctx.wujieInitPromise;
  assert.equal(returnedToBlank, true, 'teardown must use the old iframe mode after source configuration is restored');
  assert.equal(starts.at(-1).url, '/assets/php/#/versions');
});

test('borrowing from a native detail page keeps the source group in the new host route', async () => {
  const resource = borrowedSource();
  const { ctx, starts, navigations } = harness({
    routeName: 'app-detail-detail', resource, targets: { 'w7panel-ckm': ckmMicroApp() },
  });
  ctx.microAppGroup = 'w7-php';
  await ctx.getFront([resource]);
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  const target = navigations.at(-1);
  assert.equal(target.name, 'group-micro');
  assert.equal(target.params.group, 'w7-php');
  assert.equal(target.query.do, borrowedDo);
  assert.equal(target.query.microapp, undefined);
  assert.equal(starts.length, 0, 'startup waits for the new host route');
});

test('a failed borrowed menu on a native page reports the error and keeps its native selection', async () => {
  const resource = borrowedSource();
  const { ctx, starts, navigations, messages } = harness({ routeName: 'app-detail-detail', resource });
  ctx.microAppGroup = 'w7-php';
  await ctx.getFront([resource]);
  await ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  assert.equal(messages.length, 1);
  assert.equal(ctx.microError, '');
  assert.equal(ctx.selectMenu[0], 'app-detail-detail');
  assert.equal(ctx.microLoading, false);
  assert.equal(starts.length, 0);
  assert.equal(navigations.length, 0);
});

test('borrowed startup errors show a retryable page and retry the same complete do', async () => {
  let fail = true;
  const { ctx, starts } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() },
    startApp: async () => { if (fail) throw new Error('load failed'); return () => {}; },
  });
  await ctx.getData();
  assert.match(ctx.microError, /启动失败/);
  assert.equal(ctx.microLoading, false);
  fail = false;
  await ctx.retryMicroMenu();
  assert.equal(ctx.microError, '');
  assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions');
  assert.equal(ctx.$route.query.do, borrowedDo);
});

test('reselecting the same menu while startup is pending still starts the latest navigation', async () => {
  let finishStatus, markStatus;
  const statusStarted = new Promise(resolve => { markStatus = resolve; });
  let pending = true;
  const { ctx, starts } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() },
    panelGet: url => {
      if (pending && url === '/static/ckm/status') {
        pending = false;
        markStatus();
        return new Promise(resolve => { finishStatus = resolve; });
      }
    },
  });
  const initial = ctx.getData();
  await statusStarted;
  const repeated = ctx.handelMicroMenu(`w7-php:${borrowedDo}`);
  await new Promise(resolve => setImmediate(resolve));
  finishStatus({ data: { status: 'ready' } });
  await Promise.all([initial, repeated]);
  assert.equal(starts.length, 1);
  assert.equal(starts[0].url, '/assets/ckm/#/upgrade-versions');
  assert.equal(ctx.microLoading, false);
});

test('real Vue query watchers do not restart child navigation or duplicate history restoration', async () => {
  const { nextTick } = require('vue');
  const { ctx, starts, stopWatchers } = harness({
    resource: borrowedSource(), targets: { 'w7panel-ckm': ckmMicroApp() }, reactiveRoute: true,
    query: { microapp: 'w7-php', 'app-detail-micro': borrowedDo },
  });
  try {
    await ctx.getData();
    await nextTick();
    assert.equal(starts.length, 1);
    const navigate = childNavigation(starts[0]);
    await navigate('#/upgrade-versions/v1/edit');
    await nextTick();
    assert.equal(starts.length, 1);
    assert.equal(ctx.$route.query.do, `${borrowedDo}/v1/edit`);
    await ctx.handelMicroMenu('w7-php:#/versions');
    await ctx.wujieInitPromise;
    await nextTick();
    assert.equal(starts.length, 2);
    ctx.$route.query = { do: `${borrowedDo}/v1/executions` };
    await nextTick();
    await new Promise(resolve => setImmediate(resolve));
    await ctx.wujieInitPromise;
    assert.equal(starts.length, 3);
    assert.equal(starts.at(-1).url, '/assets/ckm/#/upgrade-versions/v1/executions');
  } finally {
    stopWatchers();
  }
});
