# W7Panel 前端

基于 Vue 3 + TypeScript + Arco Design 的 Kubernetes 云原生应用管理平台前端。

网关插件 AppGroup（`w7.cc/manifest-type=gateway-plugin`）只在网关插件页面管理，不在顶部菜单、应用直达和普通应用列表中展示；应用插件 AppGroup（`w7.cc/manifest-type=app-plugin`）的功能会聚合到所依赖的传统应用中，同样不在普通应用列表中单独展示。

微应用试用状态检查使用静态状态接口返回的完整 `respoUrl` 请求制品配置，保留订单等查询参数，不根据仓库根地址自行拼接。

插件应用仍持有自己的 MicroApp。传统应用页面通过 MicroApp 的 `w7.cc/depends-<releaseName>` 反向索引查找依赖它的 `w7.cc/manifest-type=app-plugin` MicroApp；单数 `w7.cc/group-name` 处理同一 Release 内资源归属，不使用复数 `w7.cc/group-names`。旧 MicroApp 缺少分组标签时，仅以与 AppGroup 同名的 `metadata.name` 精确兜底。

聚合后的 MicroApp 支持通用展示协议：`metadata.labels["w7.cc/presentation-key"]` 表示能力类型，`metadata.annotations["w7.cc/presentation-mode"]` 使用 `multiple` 保留同类全部入口，使用 `singleton` 时同一能力按现有 MicroApp 显示顺序只保留第一个入口。面板只解释这两个通用字段，不硬编码具体能力名称。

应用详情和顶部菜单启动 MicroApp 时，Wujie props 通过 `reverse_dependent_apps` 注入所有依赖当前 AppGroup 的应用摘要；该字段不包含当前 AppGroup 自身依赖的应用。

Wujie 通用宿主 handles 包含关联插件的升级检测、前往升级和卸载能力。升级检测复用应用列表的 `/panel-api/v1/zpk/upgrade-info` 参数与逻辑，确认存在新版本后才进入面板安装升级页；卸载通过面板权限下的 AppGroup 删除流程执行。

应用列表、应用详情、网关插件页和 Wujie 宿主统一使用 AppGroup 级联卸载流程。卸载目标应用前会按 `spec.dependencies` 的反向索引递归卸载依赖它的应用，并等待每个 AppGroup 的 finalizer 和卸载 Hook 完成；依赖查询、卸载或等待失败时停止后续删除，不提前卸载目标应用。

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

ZPK 安装页会在读取配置和提交安装时识别结构化订单绑定冲突：域名冲突展示原绑定域名；应用引用冲突支持跳转原面板应用列表，按唯一应用标识定位并标记待卸载应用，或在风险确认后通过原有 `reinstall` 流程强制覆盖旧安装记录。

多应用 ZPK 的安装页按启动参数的 `module_name` 解析依赖。安装器优先在 `/panel-api/v1/zpk/config` 返回的应用列表中匹配模块，并始终按当前参数的 `name` 读取来源应用的同名启动参数；`values_text` 不参与同制品应用之间的参数映射。列表中没有时再查询已安装的外部依赖。当 `PVC_NAME` 指定了 `module_name` 时，会直接继承来源应用选择的 PVC，并同时写入该子应用的启动参数和安装选项 `pvcname`。

| 模块 | 路由 | 说明 |
|------|------|------|
| 集群概览 | `/cluster/overview` | 集群资源监控 |
| 节点管理 | `/cluster/nodes` | K8s 节点管理 |
| 应用列表 | `/app/apps` | 应用部署和管理 |
| 应用详情 | `/app/appgroup/{id}` | 应用资源管理；按 `w7.cc/group-name` 展示当前应用 MicroApp，并通过 `w7.cc/depends-<groupName>` 聚合应用插件 MicroApp；同一角色关联多个 MicroApp 时按 `w7.cc/order` 排序、按 MicroApp `spec.title` 增加默认展开的二级分组，各菜单按所属 Binding 读取同名 `roleConfig`；Wujie props 的 `reverse_dependent_apps` 直接从依赖方 MicroApp 元数据汇总 |
| 顶部微应用 | `/appgroup/{id}` | 按 `w7.cc/group-name` 聚合同组 MicroApp，并通过 MicroApp 依赖标签补充应用插件入口；仅同一角色关联多个 MicroApp 时按 `w7.cc/order` 排序、按 `spec.title` 二级分组并默认展开；点击菜单时切换所属 MicroApp 和 Binding 运行配置，同时保持 Wujie AppGroup 上下文稳定 |
| 容器列表 | `/app/appgroup/{id}/pod` | Pod/容器管理 |
| 存储设备 | `/storage/disk` | Longhorn 存储 |
| 资源浏览器 | `/cluster/resource` | K8s 资源浏览 |
| 网关插件 | `/gateway/plugins` | 读取 `zm.w7.com` 制品市场网关插件清单，按类型分类展示，支持待安装插件直接安装，并提供官方应用保护、AppGroup 制品更新、独立的全局/规则开关、基于 `namespace/ingressName` 的规则配置、共享 Ingress 规则拆分、Ingress 删除清理、MicroApp 配置界面和 YAML 预览编辑 |
| AI 代理 | `/gateway/aiproxy` | AI 代理与 Key Auth 插件安装检测及引导、AI 域名插件自动开启、Higress 供应商专属配置、代理服务器、模型候选、Token 故障转移、权重、Key Auth 消费者、模型白名单和关联资源删除检测 |

AI 代理复用制品安装的 AI Proxy、Key Auth 和请求校验 WasmPlugin；其中两个通用插件统一展示为“Key Auth 认证”和“请求校验”，不使用 AI 专属名称。页面只按制品 group name 检测依赖并引导进入制品安装，不按 `*.internal` 资源名兜底，也不再自动创建 Higress 默认插件。域名仍以业务命名空间的 Ingress 为数据源，不依赖默认关闭的 Higress Console。AI Proxy、Key Auth、请求校验以及“域名管理 → 更多”的域名级规则统一使用 `namespace/ingressName`，不使用插件全局开关；旧 `domain`/裸 Ingress、Provider Secret、旧 Provider ID/名称、消费者 Secret `key` 和单数 `credential` 均不再读取或迁移。

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
