#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '集群数据库', parent: '应用管理', child: '集群数据库', path: 'app/database' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
