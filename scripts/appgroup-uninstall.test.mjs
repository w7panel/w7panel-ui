import assert from 'node:assert/strict';
import { uninstallAppGroup } from '../src/utils/appgroup.ts';

const root = { metadata: { name: 'root', namespace: 'default' } };
const dependent = {
    metadata: { name: 'dependent', namespace: 'default' },
    spec: { dependencies: [{ name: 'root', namespace: 'default' }] },
};
const deleted = new Set();
const order = [];
const client = {
    async get(path) {
        if(path.endsWith('/appgroups')){
            return { data: { items: [root, dependent] } };
        }
        const name = path.split('/').pop();
        if(deleted.has(name)){throw { status: 404 }}
        return { data: name === 'root' ? root : dependent };
    },
};
const choice = { deleteCrds: true };
const result = await uninstallAppGroup(client, 'default', 'root', {
    confirm: () => choice,
    deleteItem: async (item, selected) => {
        assert.equal(selected, choice);
        if(item.name === 'root'){assert.ok(deleted.has('dependent'))}
        order.push(item.name);
        deleted.add(item.name);
    },
});
assert.deepEqual(order, ['dependent', 'root']);
assert.deepEqual(result.deletedNames, order);

const terminating = { metadata: { name: 'root', namespace: 'default', deletionTimestamp: '2026-11-11T00:00:00Z' } };
let retried = false;
await uninstallAppGroup({
    async get(path) {
        if(path.endsWith('/appgroups')){return { data: { items: [] } }}
        if(retried){throw { status: 404 }}
        return { data: terminating };
    },
}, 'default', 'root', {
    confirm: () => ({ deleteCrds: false }),
    deleteItem: async (_, selected) => {
        assert.equal(selected.deleteCrds, false);
        retried = true;
    },
});
assert.ok(retried, 'terminating AppGroup must receive the updated CRD choice');
