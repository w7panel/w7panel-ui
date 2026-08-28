#!/usr/bin/env node
import { runMenu } from './cdp-menu-test.mjs';
runMenu({ name: '制品开发', parent: '制品开发', child: null, path: 'zpk' }).catch((error) => { console.error(error.message); process.exitCode = 1; });
