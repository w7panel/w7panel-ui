#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '系统管理', parent: '系统管理', child: '云端注册', path: 'system/cloud' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
