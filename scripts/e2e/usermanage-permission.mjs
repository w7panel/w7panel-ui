#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '权限套餐', parent: '多租户管理', child: '权限套餐', path: 'usermanage/permission' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
