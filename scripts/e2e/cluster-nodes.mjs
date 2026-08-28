#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '节点管理', parent: '集群管理', child: '节点管理', path: 'cluster/nodes' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
