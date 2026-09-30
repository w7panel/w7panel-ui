const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  findTopAppByRouteGroup,
  getTopAppGroupName,
  isCurrentAppGroupRequest,
  mapTopAppResourceToMenuItem,
  resolveWujieFileAppGroup,
} = require('../src/utils/w7panel-resource.ts');

const mappedRootItem = mapTopAppResourceToMenuItem({
  metadata: {
    name: 'w7panel-ckm-root',
    labels: {'w7.cc/group-name': 'w7panel-ckm'},
    annotations: {title: 'CKM'},
  },
  spec: {
    title: 'fallback title',
    bindings: [
      {name: 'admin', support: 'thirdparty_cd'},
      {name: 'ignored', support: 'other'},
    ],
  },
});
assert.deepEqual(mappedRootItem, {
  title: 'CKM',
  name: 'w7panel-ckm-root',
  appGroupName: 'w7panel-ckm',
  roles: ['admin'],
}, 'menu routing identity must use the MicroApp resource name, not its AppGroup name');

assert.equal(getTopAppGroupName({
  metadata: {
    name: 'w7panel-ckm-root',
    labels: {'w7.cc/group-name': 'w7panel-ckm'},
  },
}), 'w7panel-ckm');
assert.equal(getTopAppGroupName({metadata: {name: 'legacy-root'}}), 'legacy');
assert.equal(getTopAppGroupName({
  metadata: {
    name: 'resource-root',
    labels: {'w7.cc/group-name': 'legitimate-root'},
  },
}), 'legitimate-root');
assert.equal(
  getTopAppGroupName({metadata: {name: 'root-in-the-middle-root-item'}}),
  'root-in-the-middle-root-item',
);

const rootItem = {name: 'w7panel-ckm-root', appGroupName: 'w7panel-ckm'};
assert.equal(findTopAppByRouteGroup([rootItem], 'w7panel-ckm-root'), rootItem);
assert.equal(findTopAppByRouteGroup([rootItem], 'w7panel-ckm'), rootItem);
assert.equal(findTopAppByRouteGroup([rootItem], 'missing'), undefined);
assert.equal(findTopAppByRouteGroup([rootItem], ''), undefined);

const exactItem = {name: 'w7panel-ckm', appGroupName: 'another-group'};
assert.equal(
  findTopAppByRouteGroup([rootItem, exactItem], 'w7panel-ckm'),
  exactItem,
  'root MicroApp identity must win over an AppGroup alias',
);

assert.equal(
  resolveWujieFileAppGroup('w7panel-ckm', 'w7panel-ckm-root', 'route-root', true),
  'w7panel-ckm',
  'the host-resolved AppGroup must win over an untrusted MicroApp payload',
);
assert.equal(
  resolveWujieFileAppGroup('', 'payload-group', 'route-group', false),
  'payload-group',
  'the payload may provide compatibility context when the host has none',
);
assert.equal(
  resolveWujieFileAppGroup('', '', 'w7panel-ckm-root', true),
  '',
  'top-app file navigation must not treat the root route identity as an AppGroup',
);
assert.equal(
  resolveWujieFileAppGroup('', '', 'ordinary-group', false),
  'ordinary-group',
  'non-top routes retain their historical route AppGroup fallback',
);

assert.equal(isCurrentAppGroupRequest(2, 2, 'group-b', 'group-b'), true);
assert.equal(
  isCurrentAppGroupRequest(1, 2, 'group-a', 'group-a'),
  false,
  'a late response from an older request must not update the current form',
);
assert.equal(
  isCurrentAppGroupRequest(2, 2, 'group-a', 'group-b'),
  false,
  'a response for a different AppGroup must not update the current form',
);

console.log('topapp menu identity tests passed');
