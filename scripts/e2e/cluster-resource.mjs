#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '资源对象浏览器', parent: '集群管理', child: '资源对象浏览器', path: 'cluster/resource' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
