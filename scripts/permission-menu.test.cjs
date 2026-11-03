const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/utils/permission-menu.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const menuExports = {};
const k8sproxy = { get: async () => ({ data: { items: [{
  metadata: { name: 'demo' },
  spec: { title: 'Demo', bindings: [{ support: 'thirdparty_cd', name: 'ops', menu: [
    { title: 'Overview', do: '/overview', children: [{ title: 'Detail', do: '/detail' }] },
  ] }] },
}] } }) };
vm.runInNewContext(code, { exports: menuExports, require: name => name === '@/utils/cluster-access'
  ? { allowsClusterRoute: () => true }
  : { k8sproxy } });

const routes = [{ path: '/system', meta: { key: 'system', locale: 'System' }, children: [
  { path: 'audit', meta: { key: 'audit', locale: 'Audit', exclusiveGroups: ['ops', 'security'] } },
  { path: 'cloud', meta: { key: 'cloud', locale: 'Cloud' } },
  { path: 'cloud-register', meta: { key: 'cloud', locale: 'Cloud form', hideInMenu: true } },
  { path: 'hidden', meta: { hideInMenu: true }, children: [
    { path: 'detail', meta: { key: 'hidden-detail', locale: 'Hidden detail', hideInMenu: true } },
  ] },
] }];
const tree = menuExports.buildPermissionMenuTree(routes);
assert.equal(tree[0].children[0].route, 'system/audit');
assert.equal(tree[0].children[0].exclusiveGroups, undefined);
assert.equal(tree[0].children.filter(node => node.key === 'cloud').length, 1);
assert.equal(tree[0].children.find(node => node.key === 'hidden-detail').route, 'system/hidden/detail');

const matchSource = fs.readFileSync('src/utils/permission-match.ts', 'utf8');
const matchCode = ts.transpileModule(matchSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const matchExports = {};
vm.runInNewContext(matchCode, { exports: matchExports, require: () => ({ default: routes }) });
assert.equal(matchExports.keyToPermissionPath('cloud'), 'system/cloud');
assert.equal(matchExports.keyToPermissionPath('hidden-detail'), 'system/hidden/detail');

menuExports.loadPermissionMicroAppMenus('default').then(nodes => {
  assert.equal(nodes[0].disabled, true);
  assert.equal(nodes[0].children[0].children[0].disabled, true);
  assert.equal(nodes[0].children[0].children[0].children[0].children[0].title, 'Detail');
  assert.equal(nodes[0].children[0].children[0].route, '');
  assert.equal(nodes[0].children[0].children[0].exclusiveGroups, undefined);
}).catch(error => { console.error(error); process.exitCode = 1; });
