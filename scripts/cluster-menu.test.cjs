const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => imports[name] || {} });
  return exports;
}

const cluster = load('src/utils/cluster-access.ts');
const menu = load('src/utils/permission-menu.ts', { '@/utils/cluster-access': cluster });
const usermanage = load('src/router/routes/modules/usermanage.ts').default[0];
assert.deepEqual(Array.from(usermanage.meta.clusterTypes), ['main']);
const routes = [
  { path: '/usermanage', meta: { key: 'system-manage', clusterTypes: ['main'] }, children: [
    { path: 'users', meta: { key: 'system-user' } },
  ] },
  { path: '/system', meta: { key: 'system' } },
];

const mainTree = menu.buildPermissionMenuTree(routes, false);
assert.deepEqual(Array.from(mainTree, node => node.key), ['system-manage', 'system']);
assert.equal(mainTree[0].children[0].key, 'system-user');
assert.deepEqual(Array.from(menu.buildPermissionMenuTree(routes, true), node => node.key), ['system']);
assert.deepEqual(Array.from(menu.buildPermissionMenuTree(routes, null), node => node.key), ['system']);
assert.equal(cluster.allowsClusterRoute(routes[0].meta, true), false);
assert.equal(cluster.allowsClusterRoute(routes[0].meta, false), true);
assert.equal(cluster.allowsClusterRoute(routes[0].meta, null), false);
