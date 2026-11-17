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
    assert(logs.includes('terminating'), 'logs remain available during graceful Pod termination');
});

const terminalApplication = () => ({ spec: { template: { spec: {
    containers: [{ name: 'web' }, { name: 'metrics' }, { name: 'starting' }],
} } } });
const terminalPod = () => ({ metadata: { name: 'site-pod' }, spec: {
    containers: [{ name: 'sysbox-rootfs' }, { name: 'metrics' }, { name: 'web' }, { name: 'starting' }],
    initContainers: [{ name: 'setup' }],
}, status: { phase: 'Running', containerStatuses: [
    { name: 'sysbox-rootfs', state: { running: {} } },
    { name: 'metrics', state: { running: {} } },
    { name: 'web', state: { running: {} } },
    { name: 'starting', state: { waiting: {} } },
], initContainerStatuses: [{ name: 'setup', state: { terminated: { exitCode: 0 } } }] } });

test('terminal container choices exclude injected helpers and retain running declared sidecars in application order', () => {
    assert.deepEqual(Array.from(exported.siteTerminalContainers(terminalApplication(), terminalPod())), ['web', 'metrics']);
    assert.deepEqual(Array.from(exported.siteTerminalContainers(null, terminalPod())), []);
    assert.deepEqual(Array.from(exported.siteTerminalContainers(terminalApplication(), null)), []);
});

function terminalHarness(pod = terminalPod()) {
    const sourceFilename = path.resolve(__dirname, '../src/views/app/pages/site-panel.vue');
    const source = fs.readFileSync(sourceFilename, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
    const script = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const application = terminalApplication(), componentExport = {};
    const api = { async get(url) {
        if (url.endsWith('/appgroups/site')) return { data: { status: { items: [{ kind: 'Deployment', name: 'site' }] } } };
        if (url.endsWith('/deployments/site')) return { data: { ...application, spec: { ...application.spec, selector: { matchLabels: { app: 'site' } } } } };
        if (url.endsWith('/pods')) return { data: { items: Array.isArray(pod) ? pod : [pod] } };
        throw new Error(`Unexpected GET ${url}`);
    } };
    vm.runInNewContext(script, { exports: componentExport, require(name) {
        if (name === '@/utils/api') return { k8sproxy: api };
        if (name === '@/utils/site-panel') return exported;
        return {};
    } }, { filename: sourceFilename });
    const component = componentExport.default;
    const ctx = { ...component.data(), $route: { params: { group: 'site', view: 'terminal' }, query: { namespace: 'tenant' } },
        $nextTick: async () => {}, $refs: {} };
    for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx);
    for (const [name, getter] of Object.entries(component.computed)) Object.defineProperty(ctx, name, { get: getter.bind(ctx) });
    return { ctx, pod };
}

test('the site terminal defaults to the declared application container and repairs a stale helper selection on refresh', async () => {
    const { ctx } = terminalHarness();
    await ctx.load();
    assert.equal(ctx.error, '');
    assert.equal(ctx.podName, 'site-pod');
    assert.equal(ctx.container, 'web');
    assert.deepEqual(Array.from(ctx.terminalContainers), ['web', 'metrics']);
    ctx.container = 'metrics';
    await ctx.load();
    assert.equal(ctx.container, 'metrics', 'refresh retains a running declared sidecar selected by the user');
    ctx.container = 'sysbox-rootfs';
    await ctx.load();
    assert.equal(ctx.container, 'web');
    assert.deepEqual(Array.from(ctx.logContainers), ['sysbox-rootfs', 'metrics', 'web', 'starting', 'setup']);
});

test('an injected helper cannot become the terminal target while application containers are stopped', async () => {
    const pod = terminalPod();
    pod.status.containerStatuses = pod.status.containerStatuses.filter(status => status.name === 'sysbox-rootfs');
    const { ctx } = terminalHarness(pod);
    await ctx.load();
    assert.equal(ctx.error, '');
    assert.equal(ctx.selectedPod, undefined);
    assert.equal(ctx.container, '');
    assert.deepEqual(Array.from(ctx.terminalContainers), []);
});

test('terminal selects a healthy application Pod instead of a newer Pod with only an injected helper running', async () => {
    const starting = terminalPod(), ready = terminalPod();
    starting.metadata = { name: 'new-pod', creationTimestamp: '2026-11-16T02:00:00Z' };
    ready.metadata = { name: 'ready-pod', creationTimestamp: '2026-11-16T01:00:00Z' };
    starting.status.containerStatuses = starting.status.containerStatuses.filter(status => status.name === 'sysbox-rootfs');
    const { ctx } = terminalHarness([starting, ready]);
    await ctx.load();
    assert.equal(ctx.error, '');
    assert.equal(ctx.podName, 'ready-pod');
    assert.equal(ctx.container, 'web');
    ctx.$route.params.view = 'logs';
    await ctx.load();
    assert.deepEqual(Array.from(ctx.pods, pod => pod.metadata.name), ['new-pod', 'ready-pod']);
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
