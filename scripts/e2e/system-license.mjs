#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '授权管理', parent: '系统管理', child: '授权管理', path: 'system/license' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
