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
    assert.deepEqual(Array.from(helpers.domainGroupEnvs(root.domainGroups), value => ({ ...value })), []);
    assert.equal(helpers.domainBindings(root.domainGroups)[0].dnsProfileId, 'profile-1');
});

test('required and wildcard domains are validated before install', () => {
    const group = helpers.createDomainGroups([], {}, [], [{ domain: 'example.com' }], { requireDomain: true, requireDomainForce: true })[0];
    assert.equal(helpers.domainGroupError(group), '请输入域名');
    group.host = '*.example.com';
    group.autoSSL = true;
    assert.equal(helpers.domainGroupError(group), '请选择 DNS 配置');
    group.dnsProfileId = 'profile-1';
    assert.equal(helpers.domainGroupError(group), '');
    group.host = 'other.example.net';
    assert.equal(helpers.domainGroupError(group), '域名不在允许的域名列表中');
});

test('additional domain parameters are sent as separate host values', () => {
    const groups = helpers.createDomainGroups([
        { name: 'web', domainParam: 'DOMAIN_URL', routes: [{}] },
        { name: 'api', domainParam: 'DOMAIN_URL_2', autoSSL: true, routes: [{}] },
    ], { DOMAIN_URL: 'app.example.com', DOMAIN_URL_2: 'api.example.com' });
    assert.deepEqual(Array.from(helpers.domainGroupEnvs(groups), value => ({ ...value })), [
        { name: 'DOMAIN_URL', value: 'app.example.com' },
        { name: 'DOMAIN_URL_2', value: 'api.example.com' },
    ]);
    assert.equal(helpers.domainBindings(groups)[1].autoSSL, true);
});
