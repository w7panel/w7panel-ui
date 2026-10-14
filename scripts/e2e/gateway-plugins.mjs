#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '网关插件', parent: '网关管理', child: '网关插件', path: 'gateway/plugins' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
