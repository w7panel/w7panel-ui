#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: 'AI应用管理', parent: '应用管理', child: 'AI应用管理', path: 'app/gpustack' }).catch((e) => { console.error(e.message); process.exitCode = 1; });
