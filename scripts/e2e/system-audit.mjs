#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '审计日志', parent: '系统管理', child: '审计日志', path: 'system/audit' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
