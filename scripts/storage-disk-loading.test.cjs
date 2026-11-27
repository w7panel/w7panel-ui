const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/views/storage/disk.vue');
const source = fs.readFileSync(filename, 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
const code = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

for (const mode of ['cluster', 'tenant']) {
    test(`${mode} storage rows wait for both class and processed data`, async () => {
        const exports = {};
        vm.runInNewContext(code, {
            exports,
            require(name) {
                if (name === '@/utils/auth') return { getUserInfo: () => ({ 'w7.cc/user-mode': mode }), getPermission: () => [] };
                if (name === '@/store') return { useNamespaceStore: () => ({ namespace: 'tenant' }) };
                return {};
            },
        }, { filename });
        const component = exports.default;
        let finishClasses, finishData, dataStarted = false;
        const classes = new Promise(resolve => { finishClasses = resolve; });
        const data = new Promise(resolve => { finishData = resolve; });
        const state = Object.assign(component.data(), {
            testLonghornSystem() {},
            getStorageClasses() { return classes; },
            getResource() { dataStarted = true; return data; },
            getList() { dataStarted = true; return data; },
        });

        component.created.call(state);
        assert.equal(state.storageLoading, true);
        assert.equal(dataStarted, false);
        finishClasses();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(dataStarted, true);
        assert.equal(state.storageLoading, true);
        finishData();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(state.storageLoading, false);
    });
}
