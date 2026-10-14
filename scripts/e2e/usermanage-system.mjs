#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '系统设置', parent: '多租户管理', child: '系统设置', path: 'usermanage/usermanage-system' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
