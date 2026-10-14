# 菜单 E2E 测试

这些脚本通过 Chrome DevTools Protocol 操作真实页面：登录后点击一级菜单、子菜单和页面上的安全操作按钮，并校验最终路由。单独执行时创建一个页面；执行 `test:e2e:all` 时复用同一个页面和登录会话，不会重复跳转登录页。不会自动点击删除、卸载、创建、安装、保存或提交等有副作用的按钮。

## 前置条件

在 `~/.zshrc` 配置测试账号（不要提交凭据）：

```bash
export W7PANEL_USER='测试用户名'
export W7PANEL_PASS='测试密码'
```

启动服务端和 UI 后执行，例如：

```bash
npm run test:e2e:cluster
npm run test:e2e:app
```

测试环境允许验证变更按钮时，可开启变更模式。脚本会点击新建/创建/删除等按钮，并优先点击随后出现的“取消/关闭”，避免留下测试数据：

```bash
W7PANEL_E2E_MUTATIONS=1 npm run test:e2e:all
```

未设置该变量时只点击刷新、查询、详情等无副作用按钮。

可通过 `W7PANEL_CDP_URL`、`W7PANEL_APP_URL` 和 `W7PANEL_E2E_TIMEOUT_MS` 覆盖默认配置。`W7PANEL_APP_URL` 必须使用开发机 LAN 地址，默认是 `http://172.16.1.18:8011`；CDP 默认是 `http://172.16.1.149:9222`。

脚本依赖 Node.js 22 的原生 `WebSocket`，每次测试创建并关闭自己的 Chrome 页面，不关闭共享 Chrome。

## 菜单脚本

| 脚本 | 菜单路径 |
| --- | --- |
| `cluster.mjs` | 集群管理 / 概览 |
| `cluster-nodes.mjs` | 集群管理 / 节点管理 |
| `cluster-resource.mjs` | 集群管理 / 资源对象浏览器 |
| `app.mjs` | 应用管理 / 应用列表 |
| `app-product-market.mjs` | 应用管理页面点击制品市场，搜索 `whoami`、安装并填写随机测试域名 |
| `app-cronjob.mjs` | 应用管理 / 计划任务 |
| `app-database.mjs` | 应用管理 / 集群数据库 |
| `app-gpustack.mjs` | 应用管理 / AI应用管理 |
| `gateway.mjs` | 网关管理 / 反向代理 |
| `gateway-aiproxy.mjs` | 网关管理 / AI代理 |
| `gateway-dns.mjs` | 网关管理 / 私有DNS |
| `gateway-plugins.mjs` | 网关管理 / 网关插件 |
| `storage.mjs` | 存储管理 / 存储设备 |
| `storage-zone.mjs` | 存储管理 / 存储分区 |
| `zpk.mjs` | 制品开发 |
| `sitemanage.mjs` | 站点管理 |
| `system.mjs` | 系统管理 / 云端注册 |
| `system-license.mjs` | 系统管理 / 授权管理 |
| `system-audit.mjs` | 系统管理 / 审计日志 |
| `usermanage.mjs` | 多租户管理 / 用户管理 |
| `usermanage-permission.mjs` | 多租户管理 / 权限套餐 |
| `usermanage-whitedomain.mjs` | 多租户管理 / 备案域名 |
| `usermanage-site-setting.mjs` | 多租户管理 / 站点设置 |
| `usermanage-system.mjs` | 多租户管理 / 系统设置 |
