const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const site = fs.readFileSync('src/views/system/site-setting/index.vue', 'utf8');
const system = fs.readFileSync('src/views/system/system/index.vue', 'utf8');
const setting = fs.readFileSync('src/views/topapp/app-direct.vue', 'utf8');

test('direct child sessions load the same read-only main settings as embedded sessions', () => {
  assert.match(site, /<app-direct v-if="isSubCluster !== null"/);
  assert.match(site, /:main-cluster-read-only="isSubCluster"/);
  assert.match(system, /if\(this\.isSubCluster\)\{[\s\S]*?panelApi\.get\('\/auth\/main-settings'\)/);
  assert.match(setting, /if\(this\.mainClusterReadOnly\)\{[\s\S]*?panelApi\.get\('\/auth\/main-settings'\)/);
  assert.doesNotMatch(site + system, /需从主面板进入|isCkmSession\(\)/);
  assert.match(system, /v-if="!isSubCluster" type="primary" @click="submitdomainParse"/);
  assert.match(system, /@click="submitLoginConfig"/);
});
