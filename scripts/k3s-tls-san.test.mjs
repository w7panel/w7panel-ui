import assert from 'node:assert/strict';
import { nodeTlsSans } from '../src/utils/k3s-tls-san.mjs';

const node = { metadata: { annotations: { 'k3s.io/node-args': JSON.stringify([
    'server', '--token', 'secret', '--tls-san', '10.43.196.114',
    '--tls-san=k3k-ckm-umnfv-service.k3k-console-117057',
]) } } };
assert.deepEqual(nodeTlsSans(node), ['10.43.196.114', 'k3k-ckm-umnfv-service.k3k-console-117057']);
assert.deepEqual(nodeTlsSans({ metadata: { annotations: { 'k3s.io/node-args': 'invalid' } } }), []);
