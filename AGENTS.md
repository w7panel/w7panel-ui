# Repository Development Rules

## 本地联调

- 使用 `make dev` 启动本地 Vite 服务，默认端口为 `8011`。
- 浏览器从其他主机访问时使用 `http://172.16.1.18:8011`，不要使用 `localhost`。
- 开发代理由 `config/vite.config.dev.ts` 统一配置，当前指向本机 `http://172.16.1.18:18000` 的 w7panel-server；启动 UI 前先执行 server 项目的 `make dev`。

## CHANGELOG 更新规则

- 每次修改代码、配置、测试或文档时，必须在同一次变更中追加更新项目根目录的 `CHANGELOG.md`。
- 如果项目根目录不存在 `CHANGELOG.md`，必须先创建，再记录本次变更。
- 只能追加新记录，不得覆盖、删除或改写已有历史记录。
- 每条记录使用 `YYYY-MM-DD` 日期，并简要写明变更内容、影响模块和验证结果。
- 提交前必须检查本次变更是否包含对应的 `CHANGELOG.md` 更新；缺少时不得提交或推送。
