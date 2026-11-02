const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const utility = {};
const utilitySource = ts.transpileModule(fs.readFileSync('src/utils/permission-api-catalog.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(utilitySource, { exports: utility, require: () => ({}) });
assert.equal(utility.wildcardRouteCovers('/panel-api/v1/gpu/*', '/panel-api/v1/gpu/config'), true);
assert.equal(utility.wildcardRouteCovers('/panel-api/v1/gpu/*', '/panel-api/v1/gpu2/config'), false);
assert.equal(utility.wildcardRouteCovers('/panel-api/v1/namespaces/*/proxy/*', '/panel-api/v1/namespaces/default/proxy/status'), true);

const component = { exports: {} };
const script = fs.readFileSync('src/views/system/access-key/api-permission-config.vue', 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*;\s*$/gm, '')
  .replace('export default {', 'module.exports = {');
vm.runInNewContext(script, { module: component, wildcardRouteCovers: utility.wildcardRouteCovers, getLoadedApiRouteDescriptions: () => ({}) });
const { computed } = component.exports;
const context = {
  permission: { spec: { apiRules: [
    { path: '/panel-api/v1/gpu/*', method: ['*'] },
    { path: '/panel-api/v1/gpu/config', method: [] },
  ] } },
  routes: [
    { method: 'GET', path: '/panel-api/v1/gpu/config' },
    { method: 'POST', path: '/panel-api/v1/gpu/enabled-gpu' },
    { method: 'GET', path: '/panel-api/v1/other' },
  ],
  removedPaths: new Set(),
  cleared: false,
};
Object.defineProperty(context, 'wildcardRules', { get: () => computed.wildcardRules.call(context) });
Object.defineProperty(context, 'groups', { get: () => computed.groups.call(context) });
assert.deepEqual(Array.from(context.groups, group => group.path), ['/panel-api/v1/gpu/config', '/panel-api/v1/other']);
assert.deepEqual(Array.from(context.wildcardRules, rule => rule.path), ['/panel-api/v1/gpu/*']);
context.removedPaths.add('/panel-api/v1/gpu/*');
assert.deepEqual(Array.from(context.groups, group => group.path), [
  '/panel-api/v1/gpu/config', '/panel-api/v1/gpu/enabled-gpu', '/panel-api/v1/other',
]);
