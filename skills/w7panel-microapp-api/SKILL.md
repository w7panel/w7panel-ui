---
name: w7panel-microapp-api
description: Implement or troubleshoot HTTP and WebSocket API calls and host-provided helpers in the W7Panel CKM Vue microapp, including Axios requests, Wujie proxy routing, `microappProxy`, host `k8sproxy`, OIDC/CKM authentication, terminal WebSocket connections, streaming fetch requests, finding a workload's first Running Pod, and executing commands in a Pod container. Use when editing `ui/src` API calls, diagnosing authentication/proxy/connection issues, adding CKM endpoints, or using `microappProxy`, `k8sproxy`, `runningFirstPod`, and `podShell`.
---

# W7Panel Microapp API

Use the shared Axios setup before adding a new call. Inspect `ui/src/utils/request.js`, `ui/src/utils/auth.js`, and `ui/src/utils/api.js` first; preserve their authentication behavior.

## Choose the route

- Use `/ckm-api/v1/...` for CKM-owned backend APIs. Prefer this over browser-side Kubernetes proxy calls for new CKM capabilities.
- Use `k8sproxy` only for the existing user-resource/Kubernetes compatibility flow. It targets `/k8s-proxy`.
- Use `panelApi` only for W7Panel APIs. It targets `/panel-api/v1`.
- Do not put tokens in query parameters, including WebTTY URLs.

## WebSocket connections

`microappProxy`, `k8sproxy`, and `panelProxy` are Fetch-style HTTP helpers; they cannot upgrade a connection to WebSocket. For a new WebSocket, identify the actual backend route and a same-origin proxy path that forwards WebSocket upgrades. Do not assume that the HTTP helpers' authentication headers or token refresh apply to the WebSocket handshake. Browsers cannot set an `Authorization` header on `new WebSocket()`.

The W7Panel host's existing terminal connection is implemented in `src/utils/panel-websocket.ts` and called by `src/components/web-shell.vue` and `src/components/webshell-tty.vue`. It uses `/panel-api/v1/exec` for Pod terminals, `/panel-api/v1/nodetty` for node terminals, and `/panel-api/v1/tty` for the general terminal. Its helper converts the target URL to `ws:` or `wss:`, deletes any `api-token` query parameter, and authenticates with WebSocket subprotocols:

```js
const protocols = ['w7panel-terminal', `w7panel-bearer.${panelToken}`]
if (isCkmPanelSession) protocols.unshift('w7panel-ckm')
const socket = new WebSocket(wsUrl, protocols)
```

The host gets `panelToken` through its `getToken()` in `src/utils/auth.ts`; for a CKM panel session, it refreshes an expiring session before opening the socket. The host's `paneltoken` Wujie prop is a compatibility input, not a general WebSocket proxy. Use these subprotocols only for routes whose server supports them. For a CKM-owned WebSocket endpoint, check its backend handshake and proxy configuration before choosing authentication; the host currently exposes no WebSocket equivalent of `microappProxy`.

When preserving terminal behavior, keep the non-secret parameters (such as `podName`, `namespace`, `containerName`, repeated `command`, and `tty`) in the URL and send terminal data over the socket after `onopen`. In the host terminal components, the first binary message contains rows and columns as two `Uint16` values, followed by text input; output arrives through `onmessage`. The image build status connection in `src/views/cluster/nodes/build-image-status.vue` also uses `createPanelWebSocket` on the current branch.

## Prefer the host request proxy

For new Wujie microapp requests, prefer the host-provided Fetch-style `microappProxy`. It sends requests only through the current microapp backend URL and injects the current W7Panel token without exposing it to new calling code. Existing `paneltoken` injection remains available for compatibility; do not add new dependencies on it.

```js
const response = await window.$wujie.props.microappProxy('/ckm-api/v1/ckms', {
  method: 'GET',
  headers: {
    ...(getToken() ? { 'Authorization-ckm': `Bearer ${getToken()}` } : {}),
  },
  signal: controller.signal,
})

if (!response.ok) {
  throw new Error(await response.text())
}
const data = await response.json()
```

Pass only relative paths under the configured microapp backend. Absolute URLs, cross-origin backends, and paths that escape the backend prefix are rejected with `status: 400`. The host overwrites `X-W7Panel-Token` but preserves business headers such as `Authorization-ckm` and `Authorization`. The return value is a native `Response`, so inspect `ok`/`status`, choose `json()` or `text()`, and use `body.getReader()` for streams.

## Use the host Kubernetes proxy

Use the Fetch-style host `k8sproxy` for new direct Kubernetes compatibility calls. Read it from `window.$wujie.props.k8sproxy` in Wujie or `microData.cd.k8sproxy` in the legacy micro-app integration. Pass a Kubernetes API path without the `/k8s-proxy` prefix; include query parameters such as `local=1` in the path.

```js
const response = await window.$wujie.props.k8sproxy(
  '/api/v1/namespaces/default/pods?local=1',
  { signal: controller.signal },
)

if (!response.ok) {
  throw new Error(await response.text())
}
const podList = await response.json()
```

For writes, serialize JSON and set its content type explicitly:

```js
await window.$wujie.props.k8sproxy('/apis/example.w7.cc/v1/resources', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(resource),
})
```

The host fixes the request prefix to same-origin `/k8s-proxy/`, supplies the current W7Panel token, and returns a native `Response`. Absolute URLs and path traversal reject with `status: 400` and `code: INVALID_K8S_PROXY_URL`. Keep using CKM backend APIs for new CKM-owned capabilities; reserve `k8sproxy` for existing Kubernetes compatibility flows.

## Axios calls

Import `axios` from the app setup. Its interceptors set `axios.defaults.baseURL` to Wujie's `window.$wujie.props.url`, add auth headers, display errors, and retry one ordinary 401 after obtaining a new OIDC token.

```js
axios.get('/ckm-api/v1/storage-classes', { loading: true })
axios.post(`/ckm-api/v1/ckms/namespaces/${namespace}/action/${name}/rescue`)
```

The interceptor sends:

- `Authorization-ckm: Bearer <OIDC access token>` for normal CKM calls.
- `X-W7Panel-Token` for Wujie/panel-proxy authentication.

Use `noAlert: true` when the caller renders its own error. Use `skipAuthRefresh: true` only for login/config calls. Do not set `baseURL: ''` for ordinary CKM calls.

## Legacy user-resource calls

`customToken` is the cluster-login token returned by the CKM login endpoint. When preserving existing resource-tree or panel behaviors, pass it with `panelRequest: true`; this changes the header to `Authorization` and suppresses the W7Panel token header.

```js
k8sproxy.get(path, {
  baseURL: '',
  customToken: this.customToken,
  panelRequest: true,
})
```

Do not use this pattern for new CKM APIs.

## Use host-provided Pod helpers

Prefer the helpers exposed by W7Panel instead of duplicating Pod lookup or exec requests inside a microapp. In Wujie, read them from `window.$wujie.props`; in the legacy micro-app integration, read them from `microData.cd`.

### Find the first Running Pod

Call `runningFirstPod` with a workload type, namespace, and name. Supported types are `deployment`, `daemonset`, and `statefulset`, including their plural forms and case-insensitive variants.

```js
const { runningFirstPod } = window.$wujie.props

const pod = await runningFirstPod({
  type: 'statefulset',
  namespace: 'default',
  name: 'mysql',
})
```

The helper reads the workload's `spec.selector.matchLabels`, lists matching Pods through `/k8s-proxy`, and returns the first full Pod object whose `status.phase` is `Running`.

- Invalid parameters or empty `matchLabels`: `status: 400`, `code: INVALID_RUNNING_FIRST_POD_PARAMS`.
- No Running Pod: `status: 404`, `code: RUNNING_POD_NOT_FOUND`.
- Kubernetes and Axios errors propagate unchanged.

### Execute a command in a Pod container

Call `podShell` with `podName`, `containerName`, and a non-empty string or string array. Do not pass a namespace; the helper uses the current W7Panel namespace store.

```js
const { podShell } = window.$wujie.props

const response = await podShell({
  command: ['mysql', '--version'],
  podName: pod.metadata.name,
  containerName: pod.spec.containers[0].name,
})

const output = response.data
```

Pass command arrays unchanged. Convert string commands to `['sh', '-c', command]`; therefore, shell-quote every dynamic value in a string command. Prefer arrays when shell syntax is unnecessary.

The helper calls the existing `POST /panel-api/v1/exec2` endpoint with `tty: false` and returns the complete Axios response. Invalid or missing parameters reject with `status: 400` and `code: INVALID_POD_SHELL_PARAMS`; backend and Axios errors propagate unchanged. Existing `/exec2` permissions and Kubernetes RBAC still apply.

Use both helpers together when the caller starts from a workload:

```js
const { runningFirstPod, podShell } = window.$wujie.props

const pod = await runningFirstPod({
  type: 'deployment',
  namespace,
  name,
})

const response = await podShell({
  command: 'mysql --version',
  podName: pod.metadata.name,
  containerName: pod.spec.containers[0].name,
})
```

## Streaming fetch requests

Prefer `microappProxy` for new streams because it supplies W7Panel authentication and supports `AbortSignal` and `response.body` without exposing the panel token.

When preserving legacy code that calls `fetch` directly, resolve its URL against `axios.defaults.baseURL` in Wujie and add both authentication headers manually.

```js
const panelToken = window?.$wujie?.props?.paneltoken || localStorage.getItem('panelToken')
const requestUrl = resolveFetchUrl('/ckm-api/v1/...')
fetch(requestUrl, {
  signal: controller.signal,
  headers: {
    accept: 'application/json, text/plain, */*',
    ...(getToken() ? { 'Authorization-ckm': `Bearer ${getToken()}` } : {}),
    ...(panelToken ? { 'X-W7Panel-Token': panelToken } : {}),
  },
})
```

For live pod logs, use the CKM log endpoint with `follow=true`; do not call `/k8s-proxy/.../log` from the browser. Abort the previous controller before starting a replacement stream, inspect non-OK responses, and read `response.body` incrementally.

## Diagnose failures

- `401 {"code":401,"msg":"请登录"}`: the outer W7Panel proxy rejected the request; a manual `fetch` usually omitted `X-W7Panel-Token`.
- CKM `401 invalid access token`: allow the Axios retry/login flow. Older access tokens without role claims require re-login after CKM restarts.
- Kubernetes `forbidden`: add the minimal required permission to both `charts/w7panel-ckm/templates/clusterrole.yaml` and `config/rbac/cluster_role.yaml`; cluster-scoped resources need a ClusterRole rule.
- Browser timeout: move the operation to a CKM backend endpoint when it is a cluster-wide operation, and bound the backend request context before the frontend's 10-second Axios timeout.

## Verify

Run `npm run build` in `ui/`. For backend route changes, run the relevant Go tests with writable caches. Inspect the browser Network request in Wujie and confirm its URL uses the microapp proxy base URL and has the expected headers.
