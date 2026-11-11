const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createRouter, createMemoryHistory } = require('vue-router');

const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/utils/site-file-menu.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(code, { exports: exported, URL, URLSearchParams }, { filename });
const { SITE_FILES_MENU_DO, getSiteFilesMenu, nativeFileRoute, resolveSiteFileTarget } = exported;
const plain = value => JSON.parse(JSON.stringify(value));
const groupName = 'w7-prov-example';

function resources() {
  return {
    appGroup: {
      metadata: { annotations: { 'w7.cc/default-domain': 'https://site.example.com:8443/' } },
      status: { items: [
        { kind: 'Deployment', name: 'sidecar-app' },
        { kind: 'StatefulSet', name: groupName },
        { kind: 'Deployment', name: groupName },
      ] },
    },
    application: { spec: { template: { spec: {
      containers: [{ name: 'web', volumeMounts: [
        { name: 'data', subPath: 'nginx-web-dir/site.example.com', mountPath: '/www/wwwroot/' },
      ] }],
      volumes: [{ name: 'data', persistentVolumeClaim: { claimName: 'site-data' } }],
    } } } },
  };
}

function apiFor(value = resources()) {
  const calls = [];
  return {
    calls,
    async get(url) {
      calls.push(url);
      await Promise.resolve();
      if (url.includes('/appgroups/')) return { data: value.appGroup };
      if (url.includes('/deployments/')) return { data: value.application };
      throw new Error(`Unexpected API: ${url}`);
    },
  };
}

test('only the visible source menu with the exact sentinel owns a native files route', () => {
  const menu = { key: 'tool:files', microAppName: 'site-tool', do: SITE_FILES_MENU_DO, title: '目录' };
  const menus = [
    { microAppName: 'other-tool', do: SITE_FILES_MENU_DO },
    { title: '文件管理', do: '#/files', microAppName: 'site-tool' },
    { children: [menu] },
  ];
  const route = { name: 'app-detail-files', query: { do: SITE_FILES_MENU_DO, microapp: 'site-tool' } };
  assert.equal(getSiteFilesMenu(route, menus), menu);
  assert.equal(getSiteFilesMenu(route, menus.slice(0, 2)), null);
  assert.equal(getSiteFilesMenu({ ...route, name: 'group-micro' }, menus), null);
  assert.equal(getSiteFilesMenu({ ...route, query: { microapp: 'site-tool' } }, menus), null);
  assert.equal(getSiteFilesMenu({ ...route, query: { do: '#/files', microapp: 'site-tool' } }, menus), null);
  assert.equal(getSiteFilesMenu({ ...route, query: { do: SITE_FILES_MENU_DO, microapp: 'hidden-tool' } }, menus), null);
});

test('array or empty source query values cannot select a native file menu', () => {
  const menus = [{ microAppName: 'site-tool', do: SITE_FILES_MENU_DO }];
  for (const query of [
    { do: [SITE_FILES_MENU_DO], microapp: 'site-tool' },
    { do: SITE_FILES_MENU_DO, microapp: ['site-tool'] },
    { do: SITE_FILES_MENU_DO, microapp: ['site-tool', 'other-tool'] },
    { do: SITE_FILES_MENU_DO, microapp: '' },
    { do: SITE_FILES_MENU_DO, microapp: '  ' },
  ]) assert.equal(getSiteFilesMenu({ name: 'app-detail-files', query }, menus), null);
});

test('native file navigation preserves the original toFile URL without a valid source menu', () => {
  const data = { appgroup: groupName, kind: 'deployments', appname: groupName, path: '%252Fwww%252Fwwwroot' };
  const legacy = `/app/appgroup/${groupName}/deployments/${groupName}/files#path=%252Fwww%252Fwwwroot`;
  for (const source of [
    {}, { sourceMicroApp: 'site-tool' },
    { sourceMicroApp: 'site-tool', sourceMenuDo: '#/site/files' },
    { sourceMicroApp: '', sourceMenuDo: SITE_FILES_MENU_DO },
    { sourceMicroApp: '  ', sourceMenuDo: SITE_FILES_MENU_DO },
    { sourceMicroApp: ['site-tool'], sourceMenuDo: SITE_FILES_MENU_DO },
  ]) assert.equal(nativeFileRoute({ ...data, ...source }), legacy);
  assert.equal(nativeFileRoute({ ...data, path: undefined }), legacy.replace('%252Fwww%252Fwwwroot', ''));
});

test('valid source identity adds encoded query parameters before the existing path hash', () => {
  const route = nativeFileRoute({
    appgroup: groupName, kind: 'deployments', appname: groupName, path: '%252Fwww',
    sourceMicroApp: 'site-tool +&中文', sourceMenuDo: SITE_FILES_MENU_DO,
  });
  const url = new URL(route, 'https://panel.test');
  assert.equal(url.pathname, `/app/appgroup/${groupName}/deployments/${groupName}/files`);
  assert.equal(url.searchParams.get('do'), SITE_FILES_MENU_DO);
  assert.equal(url.searchParams.get('microapp'), 'site-tool +&中文');
  assert.equal(url.hash, '#path=%252Fwww');
});

test('a clicked menu resolves only the same-name main Deployment and its unique PVC site mount', async () => {
  const api = apiFor();
  const result = await resolveSiteFileTarget(api, 'tenant space', groupName);
  assert.deepEqual(api.calls, [
    `/apis/w7panel.w7.com/v1alpha1/namespaces/tenant%20space/appgroups/${groupName}`,
    `/apis/apps/v1/namespaces/tenant%20space/deployments/${groupName}`,
  ]);
  assert.deepEqual(plain(result), {
    appgroup: groupName, kind: 'deployments', appname: groupName,
    path: '%252Fwww%252Fwwwroot',
  });
});

test('Vue Router 4.0.14 and the native files decoder recover double-encoded special-character paths', async () => {
  assert.equal(require('vue-router/package.json').version, '4.0.14');
  const value = resources();
  const directory = '/www/站点 100% +?#&=';
  value.application.spec.template.spec.containers[0].volumeMounts[0].mountPath = `${directory}/`;
  const target = await resolveSiteFileTarget(apiFor(value), 'default', groupName);
  assert.equal(target.path, encodeURIComponent(encodeURIComponent(directory)));
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/app/appgroup/:group/:kind/:id/files', name: 'app-detail-files', component: {} },
  ] });
  await router.push(nativeFileRoute({ ...target, sourceMicroApp: 'site-tool', sourceMenuDo: SITE_FILES_MENU_DO }));
  const current = router.currentRoute.value;
  assert.equal(current.hash, `#path=${encodeURIComponent(directory)}`);
  assert.equal(decodeURIComponent(current.hash.match(/path=([^&]+)/)[1]), directory);
  assert.equal(current.query.do, SITE_FILES_MENU_DO);
  assert.equal(current.query.microapp, 'site-tool');
});

test('missing or ambiguous same-name main workloads are rejected without selecting another Deployment', async () => {
  const noGroupApi = apiFor();
  await assert.rejects(resolveSiteFileTarget(noGroupApi, 'default', ''), /未获取到当前应用/);
  assert.deepEqual(noGroupApi.calls, []);
  for (const duplicate of [false, true]) {
    const value = resources();
    value.appGroup.status.items = duplicate
      ? [{ kind: 'Deployment', name: groupName }, { kind: 'Deployment', name: groupName }]
      : [{ kind: 'Deployment', name: 'another-app' }, { kind: 'StatefulSet', name: groupName }];
    const api = apiFor(value);
    await assert.rejects(resolveSiteFileTarget(api, 'default', groupName), duplicate ? /主应用信息不唯一/ : /未找到站点主应用/);
    assert.equal(api.calls.length, 1);
  }
});

test('missing, malformed and non-HTTP default-domain URLs are rejected', async () => {
  for (const address of [undefined, 'site.example.com', 'https://', 'ftp://site.example.com', 'javascript:alert(1)']) {
    const value = resources();
    value.appGroup.metadata.annotations['w7.cc/default-domain'] = address;
    const api = apiFor(value);
    await assert.rejects(resolveSiteFileTarget(api, 'default', groupName), /默认域名/);
    assert.equal(api.calls.length, 1);
  }
});

test('a matching site mount in a non-first container is rejected rather than opening a different container', async () => {
  const value = resources();
  value.application.spec.template.spec.containers.unshift({ name: 'sidecar', volumeMounts: [] });
  await assert.rejects(resolveSiteFileTarget(apiFor(value), 'default', groupName), /非首个容器/);
});

test('multiple matching PVC mounts are rejected within one container and across containers', async () => {
  for (const separateContainer of [false, true]) {
    const value = resources();
    const spec = value.application.spec.template.spec;
    const mount = { ...spec.containers[0].volumeMounts[0], mountPath: '/another-site' };
    if (separateContainer) spec.containers.push({ name: 'worker', volumeMounts: [mount] });
    else spec.containers[0].volumeMounts.push(mount);
    await assert.rejects(resolveSiteFileTarget(apiFor(value), 'default', groupName), /多个匹配/);
  }
});

test('dynamic, traversal, non-PVC and unrelated mounts cannot become a site target', async () => {
  for (const update of [
    (spec, mount) => { mount.subPathExpr = 'nginx-web-dir/$(DOMAIN)'; },
    (spec, mount) => { mount.subPath = 'nginx-web-dir/../site.example.com'; },
    (spec, mount) => { mount.mountPath = '/www/../private'; },
    (spec, mount) => { mount.mountPath = 'www/wwwroot'; },
    (spec, mount) => { mount.subPath = 'nginx-web-dir/another.example.com'; },
    spec => { spec.volumes[0] = { name: 'data', emptyDir: {} }; },
  ]) {
    const value = resources();
    const spec = value.application.spec.template.spec;
    update(spec, spec.containers[0].volumeMounts[0]);
    await assert.rejects(resolveSiteFileTarget(apiFor(value), 'default', groupName), /未找到当前站点/);
  }
});

test('a missing first container cannot be used by native file management', async () => {
  const value = resources();
  value.application.spec.template.spec.containers = [];
  await assert.rejects(resolveSiteFileTarget(apiFor(value), 'default', groupName), /未找到站点主容器/);
});

test('API failures report whether app metadata or the main workload could not be loaded', async () => {
  await assert.rejects(resolveSiteFileTarget({ async get() { throw new Error('offline'); } }, 'default', groupName), /读取应用信息失败/);
  const value = resources();
  await assert.rejects(resolveSiteFileTarget({ async get(url) {
    if (url.includes('/appgroups/')) return { data: value.appGroup };
    throw new Error('offline');
  } }, 'default', groupName), /读取站点主应用失败/);
});
