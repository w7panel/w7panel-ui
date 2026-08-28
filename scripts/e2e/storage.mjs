#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '存储管理', parent: '存储管理', child: '存储设备', path: 'storage/disk' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
