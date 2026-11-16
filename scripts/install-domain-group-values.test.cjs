const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../src/utils/install-domain-group-values.js'), 'utf8').replaceAll('export function ', 'function ');
const helpers = vm.runInNewContext(`${source}\n({createDomainGroups, syncDefaultDomainGroups, domainGroupError, domainGroupEnvs, domainBindings})`);

test('domain groups preserve HTTPS, DNS profiles, and inherited defaults', () => {
    const ingress = [{ name: 'web' }, { name: 'api' }];
    const root = { domainGroups: helpers.createDomainGroups(ingress, { DOMAIN_URL: 'https://*.example.com' }, [
        { param: 'default', dnsProfileId: 'profile-1', autoResolve: true },
    ], [], { requireDomain: true, requireDomainHttps: true }) };
    const child = { domainGroups: helpers.createDomainGroups(ingress, {}, [], [], { requireDomain: true, inheritDefault: true }) };
    helpers.syncDefaultDomainGroups([root, child]);
    assert.equal(root.domainGroups[0].host, '*.example.com');
    assert.equal(root.domainGroups[0].autoSSL, true);
    assert.equal(root.domainGroups[0].dnsProfileId, 'profile-1');
    assert.equal(child.domainGroups[0].host, '*.example.com');
    assert.equal(child.domainGroups[0].autoResolve, true);
    assert.equal(helpers.domainGroupError(root.domainGroups[0]), '');
    assert.deepEqual(Array.from(helpers.domainGroupEnvs(root.domainGroups), value => ({ ...value })), [{ name: 'DOMAIN_URL', value: 'https://*.example.com' }]);
    assert.equal(helpers.domainBindings(root.domainGroups)[0].dnsProfileId, 'profile-1');
});

test('required and wildcard domains are validated before install', () => {
    const group = helpers.createDomainGroups([], {}, [], [{ domain: 'example.com' }], { requireDomain: true, requireDomainForce: true })[0];
    assert.equal(helpers.domainGroupError(group), '请填写域名');
    group.host = '*.example.com';
    group.autoSSL = true;
    assert.equal(helpers.domainGroupError(group), '请先配置泛域名 DNS 验证');
    group.dnsProfileId = 'profile-1';
    assert.equal(helpers.domainGroupError(group), '');
    group.host = 'other.example.net';
    assert.equal(helpers.domainGroupError(group), '域名不在允许的域名列表中');
});

test('additional domain parameters are sent as separate URL values', () => {
    const groups = helpers.createDomainGroups([], { DOMAIN_URL: 'http://app.example.com', API_URL: 'https://api.example.com' }, [], [], {
        requireDomain: true,
        startParams: [{ name: 'API_URL', title: '接口域名', mark: 'domain', required: true }],
    });
    assert.deepEqual(Array.from(helpers.domainGroupEnvs(groups), value => ({ ...value })), [
        { name: 'DOMAIN_URL', value: 'http://app.example.com' },
        { name: 'API_URL', value: 'https://api.example.com' },
    ]);
});
