---
name: w7panel-microapp-host-api
description: Implement and troubleshoot W7Panel microapp host integrations using panelProxy, microappProxy, k8sproxy, runningFirstPod, podShell, and loginCloud. Use when building a Wujie or legacy microapp, choosing the correct request channel, adding a host-injected helper in w7panel-ui, calling panel or Kubernetes APIs, executing Pod commands, or diagnosing proxy base URL, authentication, path, and routing failures.
---

# W7Panel Microapp Host API

Use the host-injected contract instead of reconstructing panel URLs or tokens inside a microapp.

## Read the runtime props

Support both Wujie and the legacy integration:

```js
function microappProps() {
  if (window.__POWERED_BY_WUJIE__) return window.$wujie?.props || {}
  return window.microData?.cd || {}
}
```

Do not silently call a local test API when a required helper is missing in a microapp. Throw an actionable error such as `主面板未注入 panelProxy，请升级主面板后重试`. Keep local fallbacks only for standalone development.

## Choose the request channel

Choose by ownership, not by whichever helper is available:

| Helper | Fixed target | Use for | Do not use for |
| --- | --- | --- | --- |
| `panelProxy` | `/panel-api/v1/` | Existing W7Panel APIs, including metrics and traffic | Microapp backend or raw Kubernetes APIs |
| `microappProxy` | Current microapp backend URL | APIs owned by that microapp backend | W7Panel APIs; it requires a configured backend URL |
| `k8sproxy` | `/k8s-proxy/` | Kubernetes API compatibility calls | Panel business APIs or new microapp-owned APIs |

All three proxies:

- Accept a relative path only. Do not pass an absolute URL, protocol-relative URL, or traversal path.
- Return a native `Response`; check `response.ok` and parse `json()` or `text()` explicitly.
- Override `X-W7Panel-Token` with the current host token.
- Preserve business headers supplied by the microapp.
- Reject cross-origin escapes and encoded directory traversal.

## Integrate another application

Use these patterns as application-level adapters instead of scattering proxy selection across Vue components.

### Traffic-style panel API adapter

Use this pattern for a microapp whose data already comes from `/panel-api/v1`, such as traffic, metrics, audit, or namespaces:

```js
async function readPayload(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.message || `请求失败 (${response.status})`)
  }
  return payload?.data ?? payload
}

export async function panelGet(path, params = {}) {
  const props = microappProps()
  if (typeof props.panelProxy !== 'function') {
    if (window.__POWERED_BY_WUJIE__ || window.microData?.cd) {
      throw new Error('主面板未注入 panelProxy，请升级主面板后重试')
    }
    const query = new URLSearchParams(params)
    return readPayload(await fetch(`/panel-api/v1/${path}?${query}`))
  }
  const query = new URLSearchParams(params)
  const suffix = query.size ? `?${query}` : ''
  return readPayload(await props.panelProxy(`${path}${suffix}`))
}

export const trafficApi = {
  summary: (params) => panelGet('traffic/summary', params),
  namespaces: () => panelGet('namespaces'),
}
```

Keep the direct fetch fallback for standalone development only. Never fall back from a microapp to an unauthenticated or hard-coded API host.

### CKM-style monitoring request

Use `panelProxy` for the main-panel metrics API even when the CKM microapp also has its own backend:

```js
const params = new URLSearchParams({ query, start, end, step: '60', local: '1' })
const response = await microappProps().panelProxy(`metrics/query-range?${params}`, {
  signal: abortController.signal,
})
const payload = await readPayload(response)
const series = payload?.data?.result || payload?.result || []
```

Do not send this request through CKM's `microappProxy`; the metrics route belongs to W7Panel.

### MySQL-style workload adapter

Use the stable Deployment identity to find a Pod, then execute commands through the host:

```js
const props = microappProps()
const pod = await props.runningFirstPod({
  type: 'deployment',
  namespace: 'default',
  name: props.group,
})
const containerName = pod.spec?.containers?.[0]?.name
if (!containerName) throw new Error('Pod 缺少可执行容器')

const response = await props.podShell({
  command: ['mysql', '--version'],
  podName: pod.metadata.name,
  containerName,
})
const output = response.data
```

Use `k8sproxy` separately for ConfigMap, Deployment, Service, or other Kubernetes objects. Do not use `panelProxy` for those resources.

### Microapp-owned backend adapter

Use `microappProxy` only when the installed MicroApp declares a backend URL:

```js
const response = await microappProps().microappProxy('my-api/v1/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(settings),
})
if (!response.ok) throw new Error(await response.text())
const saved = await response.json()
```

If the application is frontend-only, do not invent an empty backend URL merely to make this helper available. Use `panelProxy` or `k8sproxy` according to API ownership.

### Call a panel API

Do not include the `/panel-api/v1` prefix:

```js
const props = microappProps()
if (typeof props.panelProxy !== 'function') {
  throw new Error('主面板未注入 panelProxy，请升级主面板后重试')
}

const query = new URLSearchParams({
  query: 'sum(rate(pod_cpu_usage_seconds_total[5m]))',
  start: String(start),
  end: String(end),
  step: '60',
  local: '1',
})
const response = await props.panelProxy(`metrics/query-range?${query}`, {
  signal: controller.signal,
})
if (!response.ok) throw new Error((await response.text()) || `监控请求失败 (${response.status})`)
const payload = await response.json()
```

### Call a microapp backend

Use a path inside the configured backend prefix. Add only business authentication required by that backend; the host supplies the panel token:

```js
const response = await props.microappProxy('ckm-api/v1/ckms', {
  headers: {
    ...(accessToken ? { 'Authorization-ckm': `Bearer ${accessToken}` } : {}),
  },
  signal: controller.signal,
})
if (!response.ok) throw new Error(await response.text())
const payload = await response.json()
```

If this call throws `proxy base URL is required`, verify that the MicroApp has a backend URL. Never fix this error by using `microappProxy` for a panel API; switch that call to `panelProxy`.

### Call Kubernetes

Do not include the `/k8s-proxy` prefix:

```js
const response = await props.k8sproxy(
  '/api/v1/namespaces/default/pods?local=1',
  { signal: controller.signal },
)
if (!response.ok) throw new Error(await response.text())
const podList = await response.json()
```

For writes, serialize JSON and set the Kubernetes patch or JSON content type explicitly.

## Use workload helpers

### Find a Running Pod

Call `runningFirstPod` with a stable workload identity. Supported workload types are Deployment, DaemonSet, and StatefulSet, including plural and case-insensitive forms:

```js
const pod = await props.runningFirstPod({
  type: 'deployment',
  namespace: 'default',
  name: deploymentName,
})
```

The helper reads `spec.selector.matchLabels`, lists matching Pods, and returns the first full Pod object in `Running` phase. Handle:

- `INVALID_RUNNING_FIRST_POD_PARAMS` for invalid input or an empty selector.
- `RUNNING_POD_NOT_FOUND` when no Running Pod exists.

### Execute a Pod command

Call `podShell` with the Pod and container returned by the workload lookup:

```js
const response = await props.podShell({
  command: ['mysql', '--version'],
  podName: pod.metadata.name,
  containerName: pod.spec.containers[0].name,
})
const output = response.data
```

Prefer command arrays. A string command becomes `['sh', '-c', command]`, so shell-quote every dynamic value. Do not pass namespace; the host uses its active namespace. `podShell` returns an Axios response rather than a native `Response`.

### Request a cloud login code

Use `loginCloud(componentAppId)` only for the host-provided cloud authorization flow:

```js
const code = await props.loginCloud(componentAppId)
```

It returns parsed panel API data, not a native `Response`. Do not treat it as a general panel request helper.

## Add or change a host helper

When extending the contract in `w7panel-ui`:

1. Implement same-origin URL resolution and token injection in `src/utils/microapp-proxy.ts` or a focused host utility.
2. Accept only relative paths under a fixed prefix; reject absolute URLs, traversal, credentials, query-bearing base URLs, and cross-origin escapes.
3. Inject the helper in all three Wujie containers:
   - `src/views/app/apps/detail.vue`
   - `src/views/topapp/micro-container.vue`
   - `src/components/gateway-plugin-microapp.vue`
4. Preserve the return type across containers and document whether it is native Fetch or Axios.
5. Update the root `CHANGELOG.md` according to repository rules.

## Diagnose failures

- `proxy base URL is required`: `microappProxy` was called without a configured microapp backend. Use `panelProxy` for `/panel-api/v1` calls.
- `主面板未注入 panelProxy`: deploy a host version containing the new helper before deploying the dependent microapp.
- `401 请登录`: confirm the request used a host helper and did not delete or replace the host panel token.
- `403 没有权限`: confirm the current panel user has permission for the target panel or Kubernetes route.
- `INVALID_*_PROXY_URL`: pass a relative path inside the helper's fixed prefix and remove traversal or cross-origin input.
- Request reaches the wrong cluster: use `k8sproxy` with the intended token/routing flags; do not replace it with direct browser fetch.

## Verify

Run the host production build and the affected microapp build. In a Wujie browser session, confirm:

- Panel requests resolve under `/panel-api/v1/`.
- Kubernetes requests resolve under `/k8s-proxy/`.
- Microapp backend requests remain under that app's configured proxy URL.
- `X-W7Panel-Token` is present and no token appears in query parameters.
- Missing helpers and non-OK responses produce explicit UI errors.
