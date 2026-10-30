const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/components/domain-parse-alert.vue', 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'domain parse alert script exists');

async function domainParseFor(spec) {
  const module = { exports: {} };
  vm.runInNewContext(script.replace(/import \{ panelApi \} from '@\/utils\/api';/, '').replace('export default', 'module.exports ='), {
    module,
    panelApi: { get: async () => ({ data: { spec } }) },
  });
  const component = module.exports;
  const instance = { ...component.data(), ...component.methods };
  instance.init();
  await new Promise(setImmediate);
  return instance.domainParse;
}

test('blank A addresses remain unconfigured and mixed addresses display only values', async () => {
  assert.equal((await domainParseFor({ type: 'A', ips: ['', '  '] })).configured, false);
  const mixed = await domainParseFor({ type: 'A', ips: ['', ' 192.0.2.10 ', ' '] });
  assert.equal(mixed.configured, true);
  assert.equal(mixed.ipsText, '192.0.2.10');
});

test('CNAME configured state keeps its existing behavior', async () => {
  assert.equal((await domainParseFor({ type: 'cname', cname: '' })).configured, false);
  assert.equal((await domainParseFor({ type: 'cname', cname: 'alias.example.com' })).configured, true);
});
