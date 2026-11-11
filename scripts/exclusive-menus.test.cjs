const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/utils/exclusive-menus.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
vm.runInNewContext(code, {
  exports: moduleExports,
  require: name => name === 'vue' ? { ref: value => ({ value }) } : { panelApi: {} },
});
const policy = { rules: [{ menuRule: 'system', clusterTypes: ['main'] }], resourceVersion: '1' };
assert.equal(moduleExports.allowsExclusiveMenu(policy, 'main', '/system/audit'), true);
assert.equal(moduleExports.allowsExclusiveMenu(policy, 'child', '/system/audit'), false);
assert.equal(moduleExports.allowsExclusiveMenu(policy, 'child', '/systematic'), true);
assert.equal(moduleExports.allowsExclusiveMenu({ rules: [] }, 'child', '/system/audit'), true);

const rows = moduleExports.buildExclusiveMenuRows([
  { path: '/app', name: 'app', meta: { locale: '应用管理' }, children: [
    { path: 'apps', name: 'apps', meta: { locale: '应用列表', key: 'app-apps', permissionItems: [
      { title: '新建', key: 'app-apps-add', route: 'app/apps/add' },
    ] } },
    { path: 'traditional-apps', name: 'traditional', meta: { locale: '传统应用', key: 'app-apps' } },
    { path: 'lightweight-vms', name: 'lightweight', meta: { locale: '轻虚拟机', key: 'app-apps' } },
    { path: 'hidden', name: 'hidden', meta: { locale: '隐藏', hideInMenu: true } },
  ] },
  { path: '/system', name: 'system', meta: { locale: '系统管理' }, children: [
    { path: 'backup', name: 'backup', meta: { locale: '备份管理' } },
  ] },
  { path: '/usermanage', name: 'usermanage', meta: { locale: '多租户管理', clusterTypes: ['main'] }, children: [
    { path: 'users', name: 'users', meta: { locale: '用户管理' } },
  ] },
]);
assert.deepEqual(Array.from(rows, row => row.route), [
  'app', 'app/apps', 'app/apps/add', 'app/traditional-apps', 'app/lightweight-vms',
  'system', 'system/backup', 'usermanage', 'usermanage/users',
]);
assert.equal(rows.find(row => row.route === 'system/backup').fixedClusterType, undefined);
assert.equal(rows.find(row => row.route === 'usermanage/users').fixedClusterType, 'main');

const loadRoutes = file => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ DEFAULT_LAYOUT: () => null }) });
  return exports.default;
};
const actualRows = moduleExports.buildExclusiveMenuRows([
  ...loadRoutes('src/router/routes/modules/app.ts'),
  ...loadRoutes('src/router/routes/modules/system.ts'),
]);
for (const path of ['app/apps', 'app/traditional-apps', 'app/lightweight-vms', 'system/backup', 'system/access-key']) {
  assert(actualRows.some(row => row.route === path), `missing visible menu ${path}`);
}
assert.equal(actualRows.find(row => row.route === 'app/lightweight-vms').fixedClusterType, 'main');
