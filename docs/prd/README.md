# 标书智能审核对比系统 — 可执行 PRD（交付入口）

> **用途**：本目录是一套「可直接交给 AI 完成全部编码」的精细粒度 PRD。
> **版本**：v3.0（对话式主页入口 + 用户端/管理端双应用 + 竞标对比命名统一 + MVP 范围收敛）
> **目标**：AI 开发者按本目录顺序阅读后，无需额外澄清即可完成前后端全部编码。

---

## 1. 产品一句话

> 对话式主页作为统一入口 → 进入项目工作台 → 上传招标公告 + 我方标书 + 对手标书 → 6 个 Agent 自动拆解储能技术参数并竞标对比 → 生成差距清单和修改建议 → 多轮迭代 → 审批归档 → 自动生成项目总报告；对手标书自动归档入库，缺失时 AI 智能匹配同类对标书。MVP 仅实现「竞标对比」，标讯追踪 / 招标解读 / 标书生成 / 标书审查本版置灰。

---

## 2. 文档索引（按阅读顺序）

| # | 文件 | 内容 | 交给 AI 做什么 |
|---|------|------|---------------|
| 1 | [01-产品概述与业务需求.md](./01-产品概述与业务需求.md) | 定位/目标/画像/痛点/流程/状态机/硬规则 | 理解业务背景 |
| 2 | [02-功能需求明细.md](./02-功能需求明细.md) | 5 大模块 20+ 子模块、12 个页面、交互与验收 | 确定功能范围 |
| 3 | [03-数据模型与MySQL设计.md](./03-数据模型与MySQL设计.md) | 10 张表 MySQL DDL、ER、索引、枚举、种子数据 | **直接建库** |
| 4 | [04-API接口规范.md](./04-API接口规范.md) | 40 个接口完整契约（含请求/响应/错误） | **直接写后端 API** |
| 5 | [05-Agent编排与Prompt设计.md](./05-Agent编排与Prompt设计.md) | 6 Agent 职责/Prompt/Schema/伪代码/降级 | **直接写编排逻辑** |
| 6 | [06-前端页面与组件规范.md](./06-前端页面与组件规范.md) | 路由/组件树/状态/12 页面交互 | **直接写前端** |
| 7 | [07-技术架构与工程规范.md](./07-技术架构与工程规范.md) | 技术栈/目录结构/环境/启动/存储适配器 | 搭建工程骨架 |
| 8 | [08-开发任务与验收清单.md](./08-开发任务与验收清单.md) | 里程碑 M0-M6、任务拆解、验收标准 | 按序执行开发 |
| 9 | [09-附录与Mock数据.md](./09-附录与Mock数据.md) | 术语/枚举/mock JSON/风险兜底 | 造测试数据 |
| 10 | [context.md](./context.md) | 名词歧义澄清（术语上下文） | 统一术语口径 |
| 11 | [adr.md](./adr.md) | 决策歧义澄清（架构决策记录） | 统一决策口径 |

### 2.1 子 PRD（按功能模块拆分，页面级可独立开发）

| 模块 | 文档 | 页面/功能 |
|:---:|------|---------|
| 全局规范 | [00-全局规范.md](./00-全局规范.md) | 枚举/权限/UI/埋点/通用组件 |
| M1 认证与权限 | [modules/01-认证与权限.md](./modules/01-认证与权限.md) | 登录页 |
| M2 项目管理 | [modules/02-项目管理.md](./modules/02-项目管理.md) | 项目列表 / 新建项目 / 项目详情 / 已归档列表 |
| M3 对手标书库 | [modules/03-对手标书库与智能匹配.md](./modules/03-对手标书库与智能匹配.md) | 对手标书库页 / 智能匹配推荐 |
| M0 对话式主页 | [modules/00-对话式主页.md](./modules/00-对话式主页.md) | 对话式主页 / 项目工作台 |
| M4 竞标对比 | [modules/04-竞标对比.md](./modules/04-竞标对比.md) | 竞标对比结果页(4 Tab) / 版本 Diff |
| M5 Agent 编排 | [modules/05-Agent编排与运行记录.md](./modules/05-Agent编排与运行记录.md) | Agent 触发 / 执行状态 / 运行历史 |
| M6 报告与统计 | [modules/06-报告与统计.md](./modules/06-报告与统计.md) | 个人仪表盘 / 项目总报告 |
| M7 管理后台 | [modules/07-管理后台.md](./modules/07-管理后台.md) | Admin 管理页（系统仪表盘+用户管理） |

---

## 3. 关键决策记录（ADR）

| 编号 | 决策 | 原方案 | 新方案 | 理由 |
|:---:|------|--------|--------|------|
| ADR-1 | 数据库 | PostgreSQL 15 | **MySQL 8.0（mysql2），Docker 部署 + 云/本地兜底** | 云端优先，本地 MySQL 兜底，自动装配 |
| ADR-2 | 对象存储 | MinIO | **本地文件系统 + 云端对象存储（Docker 上传）** | 本地落盘，Docker 定时同步云端 |
| ADR-3 | PDF 解析 | pdfplumber/PyMuPDF（Python） | **pdf-parse（Node.js）** | 前后端同语言，单 Node 技术栈 |
| ADR-4 | LLM | deepseek-chat（必须 Key） | **deepseek-chat + MockLLM 降级** | 无 Key/失败时读预生成 JSON，保证可演示 |
| ADR-5 | 实时状态 | 未定义 | **前端轮询（1~2s）** | 免 WebSocket/Redis 基础设施 |
| ADR-6 | 鉴权 | 简化登录 | **JWT（jsonwebtoken）+ 种子用户** | 无状态、易实现 |
| ADR-7 | 报告导出 | 未定 | **pdfkit 生成 PDF** | Node 原生，无需额外服务 |
| ADR-8 | 审批流 | 三级审批 | **硬编码自动通过（auto_approved=1）** | 与原 PRD 一致，MVP 简化 |
| ADR-9 | 数据存储 | 单一 SQLite | **三级策略：云 MySQL → 本地 MySQL → 自动安装** | 见「数据存储方式」节 |
| ADR-10 | 应用形态 | 单前端 `web` | **用户端 `web-user` + 管理端 `web-admin` 两个前端应用，共享 server + MySQL + JWT** | 需求调整：用户端/管理端拆分 |
| ADR-11 | 首页 | 个人仪表盘 `/dashboard` | **对话式主页 `/`（左导航 + 右对话框），仪表盘并入项目工作台** | 需求调整：改为对话式入口 |
| ADR-12 | 非 MVP 功能 | 未定义 | **置灰/写死**：置灰=视觉置灰可点弹「敬请期待」；写死=静态渲染不可交互 | 迭代功能本轮仅占位 |
| ADR-13 | 命名 | 对比 `competitor_compare` | **竞标对比 `bid_compare`**：`competitor_compare→bid_compare`、`competitor_gap→bid_gap`、`CompareResult→BidCompareResult`、前端路由 `/results→/compare` | 统一产品命名 |

### 3.1 数据存储方式（三级策略）

| 优先级 | 场景 | 实现 |
|:---:|------|------|
| 1 | 云端存储（目标态） | Docker 部署 MySQL，数据通过 Docker 定时 `mysqldump` 上传到云端对象存储（S3/OSS/MinIO 云端），或直连云数据库 RDS |
| 2 | 本地 MySQL（兜底） | Docker 云端不可用时，使用本地 MySQL 8.0 |
| 3 | 自动装配 | 本地无 MySQL 时，`npm run db:provision` 自动安装（优先 Docker 拉镜像，其次按平台包管理器安装） |

---

## 4. 技术栈总览

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite + react-router-dom 6 + axios + zustand（生产 nginx 托管）；**两个应用：web-user（用户端）/ web-admin（管理端）** | SPA ×2 |
| 后端 | Node.js 18+ + Express 4 + mysql2 + multer + pdf-parse + jsonwebtoken + bcryptjs + pdfkit | REST API |
| 数据 | MySQL 8.0（库 `bid_demo`，Docker 服务 + 云/本地兜底） | 关系库 |
| 存储 | 本地 `server/storage/uploads`（Docker 卷 `uploads-data`，adapter 可切 MinIO） | 文件 |
| LLM | deepseek-chat（OpenAI 兼容 API）+ MockLLM | Agent 推理 |

---

## 5. 全局命名约定

- **标识符**：数据库表/字段用 `snake_case`；API 路径用小写 + `-`；前端组件用 `PascalCase`；TS 类型用 `PascalCase`。
- **ID**：一律 `TEXT` 存 36 位 UUID（`crypto.randomUUID()` 生成）。
- **时间**：`TEXT`，ISO8601 UTC（`new Date().toISOString()`）。
- **布尔**：`INTEGER` 0/1。
- **JSON**：`TEXT`，序列化 `JSON.stringify`。

---

## 6. 快速启动（详见 07）

**方式一：本地直接开发**

```bash
# 后端
cd server
npm install
npm run db:provision        # 自动装配 MySQL：云 → Docker → 本地 → 自动安装
npm run db:migrate          # 建表
npm run seed                # 种子用户
npm run dev                 # http://localhost:3001

# 前端（两个应用）
cd web-user && npm install && npm run dev                     # 用户端 http://localhost:5173
cd web-admin && npm install && npm run dev                    # 管理端 http://localhost:5174
```

**方式二：Docker 一键启动（MySQL + 后端 + 前端，数据可上云）**

```bash
npm run db:provision          # 自动装配数据库：云 MySQL → Docker MySQL → 本地 MySQL → 自动安装
docker compose up -d --build  # 前端 :8080 / 后端 :3001 / MySQL，数据卷与云端同步见 07
```

无 LLM Key 时：后端自动启用 MockLLM，全流程可演示。
