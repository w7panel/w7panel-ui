#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '多租户管理', parent: '多租户管理', child: '用户管理', path: 'usermanage/users' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
