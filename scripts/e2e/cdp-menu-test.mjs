#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const readZshrcValue = (name) => {
  try {
    const text = readFileSync(`${process.env.HOME}/.zshrc`, 'utf8');
    const match = text.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(["']?)([^"'\\s]+)\\1\\s*$`, 'm'));
    return match?.[2];
  } catch {
    return undefined;
  }
};

const cdpUrl = process.env.W7PANEL_CDP_URL || 'http://172.16.1.149:9222';
const appUrl = process.env.W7PANEL_APP_URL || 'http://172.16.1.18:8011';
const username = process.env.W7PANEL_USER || readZshrcValue('W7PANEL_USER');
const password = process.env.W7PANEL_PASS || readZshrcValue('W7PANEL_PASS');
const timeout = Number(process.env.W7PANEL_E2E_TIMEOUT_MS || 30000);
const allowMutations = process.env.W7PANEL_E2E_MUTATIONS === '1';

if (!globalThis.WebSocket) throw new Error('需要 Node.js 22 或更高版本');
if (/localhost|127\.0\.0\.1/.test(appUrl)) throw new Error('W7PANEL_APP_URL 必须使用 LAN 地址');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let loggedIn = false;
let id = 0;
const pending = new Map();

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}

export async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

export async function waitFor(expression, label) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await evaluate(expression).catch(() => null);
    if (value) return value;
    await sleep(200);
  }
  throw new Error(`等待${label}超时`);
}

async function connect() {
  const response = await fetch(`${cdpUrl}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`无法创建 Chrome 页面: ${response.status}`);
  const page = await response.json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
  });
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.bringToFront');
}

export async function navigate(path) {
  await call('Page.navigate', { url: `${appUrl.replace(/\/$/, '')}${path}` });
  await waitFor('document.readyState === "complete"', '页面加载');
  await sleep(700);
}

async function login() {
  await navigate('/cluster/panel');
  const hasToken = await evaluate('Boolean(localStorage.getItem("w7panel-token"))');
  if (!hasToken || (await evaluate('location.pathname === "/login"'))) {
    if (!username || !password) throw new Error('未找到登录会话，请在 ~/.zshrc 配置 W7PANEL_USER 和 W7PANEL_PASS');
    const result = await evaluate(`fetch('/panel-api/v1/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:${JSON.stringify(username)},password:${JSON.stringify(password)})}}).then(async r => ({status:r.status, body:await r.json()}))`);
    if (result.status !== 200) throw new Error(`登录失败 HTTP ${result.status}: ${JSON.stringify(result.body)}`);
    const data = result.body?.data || result.body;
    if (!data?.token) throw new Error(`登录响应缺少 token: ${JSON.stringify(result.body)}`);
    await evaluate(`localStorage.setItem('w7panel-token', ${JSON.stringify(data.token)}); localStorage.setItem('w7panel-refresh-token', ${JSON.stringify(data.refreshToken || '')}); true`);
    await navigate('/cluster/panel');
  }
  loggedIn = true;
}

export async function clickText(text) {
  const point = await evaluate(`(() => { const visible = e => { const r=e.getBoundingClientRect(); return r.width>0 && r.height>0; }; const all=[...document.querySelectorAll('button,a,.arco-menu-item,.arco-menu-inline-header,.arco-tabs-tab,.arco-link')]; const e=all.find(x => visible(x) && x.textContent.trim() === ${JSON.stringify(text)}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (!point) throw new Error(`找不到可点击控件：${text}`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await sleep(500);
}

async function openMenu(parent, child, path) {
  await navigate('/cluster/panel');
  await clickText(parent);
  if (child) await clickText(child);
  await waitFor(`location.pathname === ${JSON.stringify(`/${path}`)} || location.pathname.startsWith(${JSON.stringify(`/${path}/`)})`, `${parent}${child ? `-${child}` : ''}路由`);
}

async function clickSafeAction() {
  const clicked = await evaluate(`(() => { const allowMutations=${allowMutations}; const bad=/删除|卸载|重置|提交|保存|创建|安装|扩容|执行|确认|新建|添加/; const good=/刷新|查询|搜索|展开|详情|查看|返回|同步|重试/; const mutation=/删除|卸载|重置|创建|安装|扩容|执行|新建|添加/; const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}; const all=[...document.querySelectorAll('button,.arco-btn,.arco-link')].filter(x=>visible(x)); const e=all.find(x=>allowMutations&&mutation.test(x.textContent.trim())) || all.find(x=>good.test(x.textContent.trim())&&!bad.test(x.textContent.trim())); if(!e)return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,text:e.textContent.trim(),mutation:allowMutations&&mutation.test(e.textContent.trim())}; })()`);
  if (!clicked) return '未找到安全操作按钮（页面可能为空数据状态）';
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: clicked.x, y: clicked.y, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clicked.x, y: clicked.y, button: 'left', clickCount: 1 });
  await sleep(500);
  if (clicked.mutation) {
    const cancelled = await evaluate(`(() => { const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}; const e=[...document.querySelectorAll('button,.arco-btn,.arco-link')].find(x=>visible(x)&&/取消|关闭/.test(x.textContent.trim())); if(!e)return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,text:e.textContent.trim()}; })()`);
    if (cancelled) {
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: cancelled.x, y: cancelled.y, button: 'left', clickCount: 1 });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cancelled.x, y: cancelled.y, button: 'left', clickCount: 1 });
      await sleep(300);
      return `已点击：${clicked.text}，随后点击：${cancelled.text}`;
    }
  }
  return `已点击：${clicked.text}`;
}

export async function runMenu({ name, parent, child, path, reuse = false }) {
  if (!socket) await connect();
  if (!loggedIn) await login();
  await openMenu(parent, child, path);
  const action = await clickSafeAction();
  const currentPath = await evaluate('location.pathname');
  console.log(JSON.stringify({ menu: name, path: currentPath, action }, null, 2));
  if (!reuse) {
    socket.close();
    socket = null;
    loggedIn = false;
  }
}

export async function startSession() {
  if (!socket) await connect();
  if (!loggedIn) await login();
}

export function closeBrowserPage() {
  socket?.close();
  socket = null;
  loggedIn = false;
}
