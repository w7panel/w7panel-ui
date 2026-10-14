#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '私有DNS', parent: '网关管理', child: '私有DNS', path: 'gateway/dns' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
