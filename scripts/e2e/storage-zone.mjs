#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '存储分区', parent: '存储管理', child: '存储分区', path: 'storage/zone' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
