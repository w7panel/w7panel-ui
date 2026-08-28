#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '备案域名', parent: '多租户管理', child: '备案域名', path: 'usermanage/usermanage-whitedomain' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
