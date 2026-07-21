# W7Panel 前端

基于 Vue 3 + TypeScript + Arco Design 的 Kubernetes 云原生应用管理平台前端。

## 技术栈

- **Vue 3.5** - 响应式框架
- **TypeScript** - 类型安全
- **Arco Design** - UI 组件库
- **Pinia** - 状态管理
- **Vue Router** - 路由管理

## 项目结构

```
w7panel-ui/
├── src/
│   ├── api/                   # API 接口
│   ├── assets/                # 静态资源
│   ├── components/            # 公共组件
│   │   └── navbar/           # 导航栏
│   ├── hooks/                 # 组合式 API
│   ├── router/                # 路由配置
│   │   └── routes/           # 路由模块
│   ├── store/                # 状态管理
│   ├── styles/                # 全局样式
│   ├── utils/                 # 工具函数
│   └── views/                 # 页面组件
│       ├── app/               # 应用管理
│       ├── cluster/           # 集群管理
│       ├── gateway/           # 网关与网关插件管理
│       ├── storage/           # 存储管理
│       └── system/            # 系统管理
├── public/                    # 公共资源
└── dist/                      # 构建输出
```

## 快速开始

### 环境要求

- Node.js 18+

### 安装依赖

```bash
cd w7panel-ui
npm install --legacy-peer-deps
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

构建输出在 `dist/` 目录，需要复制到后端 `kodata/` 目录：

```bash
cp -r dist/* $BASE_DIR/dist/kodata/
```

## 主要功能页面

| 模块 | 路由 | 说明 |
|------|------|------|
| 集群概览 | `/cluster/overview` | 集群资源监控 |
| 节点管理 | `/cluster/nodes` | K8s 节点管理 |
| 应用列表 | `/app/apps` | 应用部署和管理 |
| 容器列表 | `/app/appgroup/{id}/pod` | Pod/容器管理 |
| 存储设备 | `/storage/disk` | Longhorn 存储 |
| 资源浏览器 | `/cluster/resource` | K8s 资源浏览 |
| 网关插件 | `/gateway/plugins` | Higress WasmPlugin 安装、官方应用保护、AppGroup 制品更新、状态开关、统一插件信息层级、全局配置、MicroApp 配置界面和 YAML 预览编辑 |
| AI 代理 | `/gateway/aiproxy` | AI 域名、Higress 供应商专属配置、模型候选、Token 故障转移、权重、Key Auth 消费者、模型白名单和关联资源删除检测 |

AI 代理复用 Higress 内置 `ai-proxy.internal`、`key-auth.internal` 和 `request-validation.internal` WasmPlugin；域名仍以业务命名空间的 Ingress 为数据源，不依赖默认关闭的 Higress Console。

## UI 组件

使用 Arco Design Vue 组件库，详见 [Arco Design Vue](https://arco.design/vue)

## 测试

```bash
# 面板功能测试
cd $BASE_DIR/tests
bash panel-ui-test.sh all

# 压缩功能测试
bash compress-ui-test.sh all
```

## 相关文档

- [UI 菜单地图](../docs/testing/ui/ui-menu-map.md)
- [UI 测试报告](../docs/testing/ui/)
- [用户手册](../docs/user-guide/)
