#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '网关管理', parent: '网关管理', child: '反向代理', path: 'gateway/rvproxy' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
