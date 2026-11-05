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
