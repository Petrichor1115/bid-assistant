# Spec 索引 · 标书智能审核对比系统

> 本目录是「可执行实现 Spec」，AI 开发者按 01→08 顺序实现即可完成全部编码。字段/接口/枚举的完整细节以 [docs/prd](../prd/README.md) 为权威，Spec 内嵌关键实现要点。

## 执行顺序与依赖

| 序号 | Spec | 依赖 | 产出 |
|:---:|------|------|------|
| 01 | 工程骨架与基础设施 | - | 前后端可启动、统一中间件 |
| 02 | 数据模型与数据库 | 01 | MySQL 10 表 + 种子 |
| 03 | 认证与用户管理 | 02 | JWT 登录 + 用户 CRUD |
| 04 | 项目与文件管理 | 02,03 | 项目/文件/版本 API |
| 05 | Agent 编排与智能匹配 | 02,04 | 6 Agent + mock + 库匹配 |
| 06 | 结果、审批、归档与报告 | 05 | results/审批/报告 API |
| 07 | 前端应用 | 03,04,05,06 | 用户端 web-user + 管理端 web-admin |
| 08 | 部署与云端存储 | 01,02 | Docker + 自动装配 + 云端 |

## 全局约定（实现必读）

- **ID**：`VARCHAR(36)`，`crypto.randomUUID()`。
- **响应信封**：成功 `{code:0,message:"ok",data}`；失败 `{code,message,data:null}`。
- **鉴权**：`Authorization: Bearer <jwt>`（除 login/health）。
- **枚举/错误码/权限/埋点**：见 [docs/prd/00-全局规范.md](../prd/00-全局规范.md)。
- **术语口径**：见 [docs/prd/context.md](../prd/context.md)；**决策口径**：见 [docs/prd/adr.md](../prd/adr.md)。
