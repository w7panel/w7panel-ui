#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '站点管理', parent: '站点管理', child: null, path: 'sitemanage' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
