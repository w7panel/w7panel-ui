#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '应用管理', parent: '应用管理', child: '应用列表', path: 'app/apps' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
