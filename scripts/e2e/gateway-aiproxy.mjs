#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: 'AI代理', parent: '网关管理', child: 'AI代理', path: 'gateway/aiproxy' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
