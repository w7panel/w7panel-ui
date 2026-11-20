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

test('a site file target uses the same-name Deployment and the fixed document root', () => {
  assert.deepEqual(plain(resolveSiteFileTarget(groupName)), {
    appgroup: groupName, kind: 'deployments', appname: groupName,
    path: '%252Fwww%252Fwwwroot',
  });
});

test('Vue Router 4.0.14 and the native files decoder recover double-encoded special-character paths', async () => {
  assert.equal(require('vue-router/package.json').version, '4.0.14');
  const directory = '/www/站点 100% +?#&=';
  const target = { ...resolveSiteFileTarget(groupName), path: encodeURIComponent(encodeURIComponent(directory)) };
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

test('a missing application cannot produce a site file target', () => {
  for (const group of ['', '  ', undefined]) {
    assert.throws(() => resolveSiteFileTarget(group), /未获取到当前应用/);
  }
});
