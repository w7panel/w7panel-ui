#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '站点设置', parent: '多租户管理', child: '站点设置', path: 'usermanage/site-setting' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
