const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/utils/site-panel.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(code, { exports: exported, URL, URLSearchParams }, { filename });
const { sitePanelUrl, sitePodSelector, sitePanelPods } = exported;

test('native tools keep the panel origin and bind the site and namespace', () => {
    for (const view of ['files', 'terminal', 'logs']) {
        const url = new URL(sitePanelUrl('https://panel.example.com/app?old=1#config', 'site-name', 'tenant', view, 'test-token'));
        assert.equal(url.origin, 'https://panel.example.com');
        assert.equal(url.pathname, `/dialog/appgroup/site-name/site-panel/${view}`);
        assert.equal(url.searchParams.get('namespace'), 'tenant');
        assert.equal(new URLSearchParams(url.hash.slice(1)).get('paneltoken'), 'test-token');
        assert.equal(url.searchParams.has('paneltoken'), false);
        assert.equal(url.searchParams.has('old'), false);
        assert(!url.hash.includes('config'));
    }
    assert.throws(() => sitePanelUrl('https://panel.example.com', 'site', 'tenant', 'https://other.example.com', 'token'));
    assert.throws(() => sitePanelUrl('https://panel.example.com', '', 'tenant', 'files', 'token'));
});

test('Pod lookup uses deployment selectors and rejects empty namespace-wide lookups', () => {
    const selector = sitePodSelector({ spec: { selector: { matchLabels: { app: 'site' }, matchExpressions: [
        { key: 'tier', operator: 'In', values: ['web', 'worker'] },
        { key: 'retired', operator: 'DoesNotExist' },
    ] } } });
    assert.equal(selector, 'app=site,tier in (web,worker),!retired');
    assert.throws(() => sitePodSelector({}), /选择器/);
});

test('terminal excludes stopped and terminating Pods while logs retain exited instances', () => {
    const pods = [
        { metadata: { name: 'failed', creationTimestamp: '2026-11-13T01:00:00Z' }, status: { phase: 'Failed' } },
        { metadata: { name: 'live', creationTimestamp: '2026-11-13T02:00:00Z' }, status: { phase: 'Running', containerStatuses: [{ state: { running: {} } }] } },
        { metadata: { name: 'terminating', deletionTimestamp: '2026-11-13T03:00:00Z' }, status: { phase: 'Running', containerStatuses: [{ state: { running: {} } }] } },
        { metadata: { name: 'not-started' }, status: { phase: 'Running', containerStatuses: [{ state: { waiting: {} } }] } },
    ];
    assert.deepEqual(Array.from(sitePanelPods(pods, 'terminal'), pod => pod.metadata.name), ['live']);
    const logs = Array.from(sitePanelPods(pods, 'logs'), pod => pod.metadata.name);
    assert.equal(logs[0], 'live');
    assert(logs.includes('failed'));
    assert(!logs.includes('terminating'));
});

test('embedded tools use the frame session fragment without changing ordinary dialog authentication', () => {
    const authFilename = path.resolve(__dirname, '../src/utils/auth.ts');
    const authCode = ts.transpileModule(fs.readFileSync(authFilename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const location = { pathname: '/dialog/appgroup/site/site-panel/terminal', search: '?namespace=tenant', hash: '#paneltoken=frame-token' };
    const auth = {};
    vm.runInNewContext(authCode, { exports: auth, URLSearchParams, window: { location },
        localStorage: { getItem: () => 'stored-token' },
        require: name => { assert.equal(name, './permission-match'); return { expandPermissionValues: values => values }; },
    }, { filename: authFilename });
    assert.equal(auth.getToken(), 'frame-token');
    assert.equal(auth.isLogin(), true);
    location.pathname = '/dialog/appgroup/site/deployments/site/files';
    location.search = '?paneltoken=legacy-token';
    assert.equal(auth.getToken(), 'legacy-token');
    location.pathname = '/app';
    assert.equal(auth.getToken(), 'stored-token');
});
