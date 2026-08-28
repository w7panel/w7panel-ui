#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '计划任务', parent: '应用管理', child: '计划任务', path: 'app/cronjob' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
