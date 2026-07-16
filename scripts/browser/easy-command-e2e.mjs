#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';

const startedAt = Date.now();
const cdpUrl = process.env.W7PANEL_CDP_URL || 'http://172.16.1.149:9222';
const appUrl = process.env.W7PANEL_APP_URL || 'http://172.16.1.18:8011/app/apps';
const podTimeout = Number(process.env.W7PANEL_POD_TIMEOUT_MS || 120_000);
const pageTimeout = Number(process.env.W7PANEL_PAGE_TIMEOUT_MS || 30_000);
const stamp = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Date.now().toString(36).slice(-5)}`;
const appName = `easycmd-e2e-${stamp}`.toLowerCase();
const artifactDir = `/tmp/w7panel-browser-test/${stamp}`;

if (Number(process.versions.node.split('.')[0]) < 22 || typeof WebSocket === 'undefined') {
  throw new Error('test:browser:easy-command requires Node.js 22 or newer');
}
if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(appUrl)) {
  throw new Error('W7PANEL_APP_URL must use the LAN address, not localhost or 127.0.0.1');
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
const serverOutput = [];
let viteProcess = null;
let socket = null;
let ownsPageTarget = false;
let callId = 0;
const pending = new Map();
const consoleErrors = [];
const requestUrls = new Map();
const failedAssets = [];
const appApiResponses = [];
const activeContainerRootExpression = `document.querySelector('.a-form-container-tabs .arco-tabs-content-item-active')`;
const createDrawerExpression = `Array.from(document.querySelectorAll('.arco-drawer')).find((element) => element.getBoundingClientRect().width > 0 && element.innerText.includes('创建应用'))`;

async function fetchOk(url, timeout = 3_000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureVite() {
  if (await fetchOk(appUrl)) return false;

  const url = new URL(appUrl);
  viteProcess = spawn('npm', ['run', 'dev', '--', '--port', url.port || '8011'], {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const collect = (chunk) => {
    serverOutput.push(String(chunk));
    if (serverOutput.length > 80) serverOutput.shift();
  };
  viteProcess.stdout.on('data', collect);
  viteProcess.stderr.on('data', collect);

  const deadline = Date.now() + pageTimeout;
  while (Date.now() < deadline) {
    if (viteProcess.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready (${viteProcess.exitCode})`);
    }
    if (await fetchOk(appUrl)) return true;
    await sleep(250);
  }
  throw new Error(`Vite did not become ready within ${pageTimeout}ms`);
}

async function stopVite() {
  if (!viteProcess || viteProcess.exitCode !== null) return;
  try {
    process.kill(-viteProcess.pid, 'SIGINT');
  } catch {
    viteProcess.kill('SIGINT');
  }
  await Promise.race([
    new Promise((resolve) => viteProcess.once('exit', resolve)),
    sleep(3_000),
  ]);
  if (viteProcess.exitCode === null) {
    try {
      process.kill(-viteProcess.pid, 'SIGKILL');
    } catch {
      viteProcess.kill('SIGKILL');
    }
  }
}

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++callId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function connectCdp() {
  const versionUrl = `${cdpUrl.replace(/\/$/, '')}/json/version`;
  if (!(await fetchOk(versionUrl, 5_000))) throw new Error(`CDP is unavailable: ${versionUrl}`);

  let page;
  try {
    const response = await fetch(`${cdpUrl.replace(/\/$/, '')}/json/new?${encodeURIComponent('about:blank')}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) {
      page = await response.json();
      ownsPageTarget = true;
    }
  } catch {
    // Older Chrome endpoints may not support target creation; reuse an existing page below.
  }
  if (!page) {
    const pagesResponse = await fetch(`${cdpUrl.replace(/\/$/, '')}/json/list`, {
      signal: AbortSignal.timeout(5_000),
    });
    const pages = await pagesResponse.json();
    const appOrigin = new URL(appUrl).origin;
    page = pages.find((item) => item.type === 'page' && item.url.startsWith(appOrigin))
      || pages.find((item) => item.type === 'page');
  }
  if (!page) throw new Error('No Chrome page target is available');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === 'Network.requestWillBeSent') {
      requestUrls.set(message.params.requestId, {
        url: message.params.request.url,
        type: message.params.type,
      });
    }
    if (message.method === 'Network.loadingFailed') {
      const request = requestUrls.get(message.params.requestId);
      if (request && ['Script', 'Stylesheet'].includes(request.type) && !message.params.canceled) {
        failedAssets.push({ ...request, error: message.params.errorText });
      }
    }
    if (message.method === 'Network.responseReceived') {
      const { response } = message.params;
      if (response.url.includes('/apis/apps/v1/')) {
        appApiResponses.push({ url: response.url, status: response.status, statusText: response.statusText });
      }
    }
  });

  await call('Page.enable');
  await call('Page.bringToFront');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 992,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function waitFor(expression, description, timeout = pageTimeout) {
  const deadline = Date.now() + timeout;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      lastValue = await evaluate(expression);
      if (lastValue) return lastValue;
    } catch {
      // The page may be between navigations; retry until the deadline.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}; last value: ${JSON.stringify(lastValue)}`);
}

const visibleHelpers = `
  const visible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const center = (element) => {
    if (!visible(element)) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };
`;

async function pointForText(text, selector = 'button,span,div,a', root = 'document') {
  return evaluate(`(() => {
    ${visibleHelpers}
    const text = ${JSON.stringify(text)};
    const candidates = Array.from((${root}).querySelectorAll(${JSON.stringify(selector)}))
      .filter((element) => visible(element) && element.textContent.trim() === text);
    const leaf = candidates.find((element) => !Array.from(element.children).some((child) => child.textContent.trim() === text));
    const target = leaf || candidates[0];
    target?.scrollIntoView({ block: 'center', inline: 'center' });
    if (!target) return null;
    window.__w7PointerClickReceived = false;
    target.addEventListener('click', () => { window.__w7PointerClickReceived = true; }, { capture: true, once: true });
    const point = center(target);
    const hit = document.elementFromPoint(point.x, point.y);
    return {
      ...point,
      verifyClick: true,
      hit: hit ? hit.tagName + '.' + hit.className : null,
    };
  })()`);
}

async function pointForFormControl(label, selector, scope = 'document') {
  return evaluate(`(() => {
    ${visibleHelpers}
    const root = ${scope};
    const label = ${JSON.stringify(label)};
    const item = Array.from(root.querySelectorAll('.arco-form-item'))
      .find((element) => visible(element) && element.querySelector('.arco-form-item-label-col')?.textContent.trim() === label);
    const target = item?.querySelector(${JSON.stringify(selector)});
    target?.scrollIntoView({ block: 'center', inline: 'center' });
    return center(target);
  })()`);
}

async function pointForSelector(selector) {
  return evaluate(`(() => {
    ${visibleHelpers}
    const target = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(visible);
    target?.scrollIntoView({ block: 'center', inline: 'center' });
    return center(target);
  })()`);
}

async function pointerClick(point, description) {
  if (!point) throw new Error(`Visible target not found: ${description}`);
  await call('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1,
  });
  await call('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1,
  });
  if (point.verifyClick && !(await evaluate('window.__w7PointerClickReceived === true'))) {
    throw new Error(`Target did not receive pointer click: ${description}; point=${JSON.stringify(point)}`);
  }
}

async function clickText(text, selector, root) {
  try {
    await pointerClick(await pointForText(text, selector, root), text);
  } catch (error) {
    if (!String(error.message).startsWith('Target did not receive pointer click:')) throw error;
    await call('Page.bringToFront');
    await sleep(100);
    await pointerClick(await pointForText(text, selector, root), `${text}（重试）`);
  }
}

async function replaceText(point, value, description) {
  await pointerClick(point, description);
  await call('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: 'a', code: 'KeyA', modifiers: 2,
    windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65,
  });
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2,
    windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65,
  });
  await call('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key: 'Backspace', code: 'Backspace',
    windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Backspace', code: 'Backspace',
    windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8,
  });
  await call('Input.insertText', { text: value });
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  await sleep(100);
}

async function scrollAt(x, y, deltaY) {
  await call('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x, y, deltaX: 0, deltaY,
  });
  await sleep(150);
}

const activeCommandStateExpression = `(() => {
    ${visibleHelpers}
    const root = ${activeContainerRootExpression};
    const item = Array.from(root.querySelectorAll('.arco-form-item'))
      .find((element) => visible(element) && element.querySelector('.arco-form-item-label-col')?.textContent.trim() === '运行命令');
    const argsItem = Array.from(root.querySelectorAll('.arco-form-item'))
      .find((element) => visible(element) && element.querySelector('.arco-form-item-label-col')?.textContent.trim() === '运行参数');
    return item ? {
      checked: Boolean(item.querySelector('.arco-switch-checked')),
      commands: Array.from(item.querySelectorAll('textarea')).map((element) => element.value),
      args: argsItem ? Array.from(argsItem.querySelectorAll('textarea')).map((element) => element.value) : [],
    } : null;
  })()`;

async function activeCommandState() {
  return evaluate(activeCommandStateExpression);
}

async function clickActiveCommandSwitch() {
  const point = await pointForFormControl('运行命令', '.arco-switch', activeContainerRootExpression);
  await pointerClick(point, '运行命令 / 简易模式');
}

async function navigate(url) {
  await call('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`, 'document load');
}

async function saveFailureArtifacts(error) {
  await mkdir(artifactDir, { recursive: true });
  const diagnostic = {
    error: error.stack || String(error),
    appName,
    appUrl,
    cdpUrl,
    elapsed: elapsed(),
    currentUrl: null,
    bodyText: null,
    consoleErrors,
    failedAssets,
    appApiResponses,
    serverOutput,
  };
  if (socket?.readyState === WebSocket.OPEN) {
    try {
      diagnostic.currentUrl = await evaluate('location.href');
      diagnostic.bodyText = await evaluate('document.body?.innerText?.slice(-5000) || ""');
      const screenshot = await call('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: false,
      });
      await writeFile(`${artifactDir}/failure.png`, Buffer.from(screenshot.data, 'base64'));
    } catch (artifactError) {
      diagnostic.artifactError = String(artifactError);
    }
  }
  await writeFile(`${artifactDir}/diagnostic.json`, JSON.stringify(diagnostic, null, 2));
}

async function run() {
  const startedVite = await ensureVite();
  await connectCdp();
  await navigate(appUrl);

  await waitFor(`document.body?.innerText?.includes('应用列表')`, 'authenticated application list');
  await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const loginVisible = await evaluate(`document.body?.innerText?.includes('登录') && !document.body?.innerText?.includes('应用列表')`);
  if (loginVisible) throw new Error('Shared Chrome is not authenticated');

  await clickText('新建', 'button');
  await waitFor(`${createDrawerExpression} !== undefined`, 'create application drawer');

  if (!(await evaluate(`document.body?.innerText?.includes('my-container')`))) {
    await pointerClick(await pointForSelector('.a-form-container-tabs .arco-tabs-nav-add-btn'), '添加首个容器');
  }
  await waitFor(`document.body?.innerText?.includes('my-container')`, 'first container');
  await waitFor(`Array.from(document.querySelectorAll('.arco-drawer')).some((element) => element.getBoundingClientRect().width >= 1000)`, 'expanded create drawer');

  await replaceText(await pointForFormControl('应用名称', 'input'), appName, '应用名称');
  await waitFor(`Array.from(document.querySelectorAll('.arco-form-item')).some((item) => item.querySelector('.arco-form-item-label-col')?.textContent.trim() === '应用名称' && item.querySelector('input')?.value === ${JSON.stringify(appName)})`, 'application name input');
  await sleep(500);
  await replaceText(await pointForFormControl('应用标识', 'input'), appName, '应用标识');
  await waitFor(`Array.from(document.querySelectorAll('.arco-form-item')).some((item) => item.querySelector('.arco-form-item-label-col')?.textContent.trim() === '应用标识' && item.querySelector('input')?.value === ${JSON.stringify(appName)})`, 'application identifier input');

  await pointerClick(await pointForSelector('.a-form-container-tabs .arco-tabs-nav-add-btn'), '添加第二个容器');
  await waitFor(`document.querySelectorAll('.a-form-container-tabs .arco-tabs-tab-title').length >= 2`, 'second container');
  await waitFor(`document.querySelector('.a-form-container-tabs .arco-tabs-tab-active')?.innerText.includes('container-')`, 'active second container');

  await replaceText(await pointForFormControl('应用镜像', 'input', activeContainerRootExpression), 'nginx:alpine', '第二容器应用镜像');
  await waitFor(`(${activeContainerRootExpression}).querySelectorAll('.arco-form-item').length && Array.from((${activeContainerRootExpression}).querySelectorAll('.arco-form-item')).some((item) => item.querySelector('.arco-form-item-label-col')?.textContent.trim() === '应用镜像' && item.querySelector('input')?.value === 'nginx:alpine')`, 'second container image');
  await clickText('高级设置', undefined, activeContainerRootExpression);
  await waitFor(`Array.from(document.querySelectorAll('.arco-form-item-label-col')).some((element) => element.textContent.trim() === '运行命令' && element.getBoundingClientRect().height > 0)`, 'advanced command controls');
  await replaceText(await pointForFormControl('运行命令', 'textarea', activeContainerRootExpression), 'sleep 3600', '第二容器简易命令');

  await scrollAt(1500, 300, -1600);
  await clickText('my-container');
  await scrollAt(1500, 800, 1200);
  await waitFor(`${activeCommandStateExpression} !== null`, 'first container controls');
  await clickActiveCommandSwitch();
  await waitFor(`${activeCommandStateExpression}?.checked === false`, 'advanced command mode');
  await replaceText(await pointForFormControl('运行命令', 'textarea', activeContainerRootExpression), 'sleep', '首容器运行命令');
  await replaceText(await pointForFormControl('运行参数', 'textarea', activeContainerRootExpression), '3600', '首容器运行参数');

  await clickActiveCommandSwitch();
  await waitFor(`Array.from(document.querySelectorAll('.arco-modal')).some((element) => element.getBoundingClientRect().width > 0 && element.innerText.includes('转换运行命令'))`, 'conversion confirmation');
  await clickText('取消', '.arco-modal button');
  await waitFor(`!Array.from(document.querySelectorAll('.arco-modal')).some((element) => element.getBoundingClientRect().width > 0 && element.innerText.includes('转换运行命令'))`, 'conversion cancellation');
  let state = await activeCommandState();
  if (state.checked || state.commands[0] !== 'sleep' || state.args[0] !== '3600') {
    throw new Error(`Cancel changed the command state: ${JSON.stringify(state)}`);
  }

  await clickActiveCommandSwitch();
  await waitFor(`Array.from(document.querySelectorAll('.arco-modal')).some((element) => element.getBoundingClientRect().width > 0 && element.innerText.includes('转换运行命令'))`, 'conversion confirmation');
  await clickText('继续转换', '.arco-modal button');
  await waitFor(`${activeCommandStateExpression}?.checked === true`, 'confirmed easy command mode');
  await waitFor(`!Array.from(document.querySelectorAll('.arco-modal-wrapper')).some((element) => element.getBoundingClientRect().height > 0 && getComputedStyle(element).pointerEvents !== 'none')`, 'conversion modal overlay removal');
  state = await activeCommandState();
  if (state.commands[0] !== 'sleep 3600' || state.args.length) {
    throw new Error(`Unexpected converted command: ${JSON.stringify(state)}`);
  }

  const activePortItemExpression = `Array.from((${activeContainerRootExpression}).querySelectorAll('.arco-form-item')).find((item) => item.querySelector('.arco-form-item-label-col')?.textContent.trim() === '暴露端口')`;
  await evaluate(`(${activePortItemExpression}).querySelector('.arco-select-view').click()`);
  await waitFor(`Array.from(document.querySelectorAll('.arco-select-dropdown')).some((element) => element.getBoundingClientRect().height > 0)`, 'protocol dropdown');
  await evaluate(`Array.from(document.querySelectorAll('.arco-select-option')).find((element) => element.textContent.trim() === 'TCP').click()`);
  await waitFor(`(${activePortItemExpression}).innerText.includes('TCP')`, 'TCP protocol selection');

  await scrollAt(1500, 300, -1800);
  await clickText('确定', 'button', createDrawerExpression);
  const submissionDeadline = Date.now() + 60_000;
  while (Date.now() < submissionDeadline) {
    if (!(await evaluate(`${createDrawerExpression} !== undefined`))) break;
    const failedResponse = appApiResponses.find((response) => response.status >= 400);
    if (failedResponse) throw new Error(`Application API failed: ${JSON.stringify(failedResponse)}`);
    await sleep(200);
  }
  if (await evaluate(`${createDrawerExpression} !== undefined`)) {
    throw new Error(`Timed out waiting for application submission; API responses: ${JSON.stringify(appApiResponses)}`);
  }
  await waitFor(`document.body?.innerText?.includes(${JSON.stringify(appName)})`, 'created application row', 60_000);
  await clickText(appName);

  const detailUrl = await waitFor(`location.pathname.includes('/app/appgroup/') && location.pathname.endsWith('/detail') && location.href`, 'application detail', 60_000);
  const detailText = await waitFor(`document.body?.innerText?.includes('container-') && document.body.innerText.includes('sleep 3600') && document.body.innerText`, 'container detail data', 60_000);
  const commandOccurrences = (detailText.match(/sleep 3600/g) || []).length;
  if (commandOccurrences < 2) throw new Error(`Expected two converted commands, found ${commandOccurrences}`);

  await scrollAt(500, 300, -1800);
  await clickText('容器列表', '.arco-menu-item');
  const podResult = await waitFor(`document.body?.innerText?.includes('Running') && ({
    url: location.href,
    text: document.body.innerText,
    selectedMenus: Array.from(document.querySelectorAll('.arco-menu-selected')).map((element) => element.textContent.trim()),
  })`, 'Running pod', podTimeout);
  if (!podResult.selectedMenus.includes('容器列表')) throw new Error('容器列表 menu is not selected');

  await scrollAt(500, 300, -1800);
  await clickText('应用详情', '.arco-menu-item');
  await waitFor(`location.pathname.endsWith('/detail')`, 'return to application detail');
  await waitFor(`(document.body?.innerText?.match(/sleep 3600/g) || []).length >= 2 && !document.body.innerText.includes('加载中...')`, 'reloaded application detail');
  await clickText('修改', 'button');
  await waitFor(`Array.from(document.querySelectorAll('.arco-drawer')).some((element) => element.getBoundingClientRect().width > 0)`, 'edit drawer');
  const restored = await waitFor(`(() => {
    ${visibleHelpers}
    const items = Array.from(document.querySelectorAll('.a-form-container-tabs .arco-form-item'))
      .filter((element) => element.querySelector('.arco-form-item-label-col')?.textContent.trim() === '运行命令');
    const states = items.map((item) => ({
      checked: Boolean(item.querySelector('.arco-switch-checked')),
      value: item.querySelector('textarea')?.value,
    }));
    return states.length === 2 && states.every((item) => item.checked && item.value === 'sleep 3600') && states;
  })()`, 'restored easy command state');

  if (consoleErrors.length || failedAssets.length) {
    throw new Error(`Browser errors detected: ${JSON.stringify({ consoleErrors, failedAssets })}`);
  }

  console.log(JSON.stringify({
    passed: true,
    elapsed: elapsed(),
    startedVite,
    appName,
    detailUrl,
    podUrl: podResult.url,
    podStatus: 'Running',
    restoredContainers: restored.length,
    resourceRetained: true,
  }, null, 2));
}

try {
  await run();
} catch (error) {
  await saveFailureArtifacts(error);
  console.error(error.stack || String(error));
  console.error(`Failure artifacts: ${artifactDir}`);
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    if (ownsPageTarget) await call('Page.close').catch(() => {});
    socket.close();
  }
  await stopVite();
}
