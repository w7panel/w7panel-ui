#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '集群管理', parent: '集群管理', child: '概览', path: 'cluster/panel' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
