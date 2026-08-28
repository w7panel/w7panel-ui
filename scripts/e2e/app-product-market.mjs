#!/usr/bin/env node
import { clickText, evaluate, navigate, startSession, waitFor } from './cdp-menu-test.mjs';

const domain = `e2e-${Date.now().toString(36)}.fan.b2.sz.w7.com`;
await startSession();
await navigate('/cluster/panel');
await clickText('应用管理');
await clickText('应用列表');
await clickText('制品市场');

await waitFor('document.body.innerText.includes("制品市场") || document.body.innerText.includes("whoami")', '制品市场微应用');
const input = await evaluate(`(() => { const all=[...document.querySelectorAll('input')]; const e=all.find(x=>x.placeholder?.includes('搜索') || x.placeholder?.includes('应用名称')); if(!e)return null; e.focus(); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
if (!input) throw new Error('找不到制品市场搜索框（远程微应用可能未加载或为跨域 iframe）');
await evaluate(`(() => { const e=[...document.querySelectorAll('input')].find(x=>x.placeholder?.includes('搜索') || x.placeholder?.includes('应用名称')); if(!e)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(e,'whoami'); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true; })()`);
await waitFor('document.body.innerText.toLowerCase().includes("whoami")', 'whoami 搜索结果');
await clickText('安装');
await waitFor('document.body.innerText.includes("域名") || [...document.querySelectorAll("input")].some(x=>x.placeholder?.includes("域名"))', '安装域名表单');
const filled = await evaluate(`(() => { const e=[...document.querySelectorAll('input')].find(x=>x.placeholder?.includes('域名') || x.getAttribute('aria-label')?.includes('域名')); if(!e)return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(e,${JSON.stringify(domain)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
if (!filled) throw new Error('找不到安装域名输入框');
await clickText('安装');
console.log(JSON.stringify({ menu: '应用管理 / 制品市场', keyword: 'whoami', domain, action: '已搜索、安装并填写域名' }, null, 2));
