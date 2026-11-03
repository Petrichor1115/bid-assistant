# 投标智能助手 · Bid Assistant

> **AI 把竞品标书拆成对比表和差距清单。**
> 上传「招标公告 + 我方标书 + 竞品标书」三件套，6 个 Agent 自动拆解储能技术参数，输出逐条覆盖度裁决、竞标差距清单与修改建议。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-61dafb.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)

---

## 1. 这是什么

投标专员面对的一个典型场景：招标公告 68 页、我方标书 240 页、竞标文件 200+ 页，三天内要拉出一份参数对比表，还要回答评审会上的「这个结论依据在哪一页」。

本项目是面向投标专员的 **AI 审查副驾**，本期只做招投标链路中的 **「析标（竞标分析）」** 一格：

```
上传三件套 → AI 一键审查 → 差距清单 → 修改迭代 → 提交审批 → 归档报告
```

- 输入：招标公告、我方标书、竞品标书（PDF / DOCX）
- 处理：6 个 Agent 顺序编排，LLM 负责非结构化拆解，规则负责打分与兜底
- 输出：结构化参数对比表、招标要求覆盖度 ✅❌⚠️、🔴🟡🟢 差距分级、逐条修改建议、可导出的 PDF 报告
- 沉淀：竞品标书自动入「对手标书库」，缺失时按项目类型/规模/技术参数智能匹配历史标书

> 招投标全链路为「找标 → 读标 → 写标 → 审标 → 析标」。本项目只落地「析标」，其余环节在文档中作为规划保留。

---

## 2. 核心能力

### 2.1 六 Agent 流水线

| # | Agent | 职责 | 主要产出 |
|:--:|-------|------|----------|
| 1 | `parse_announcement` 公告解析 | 从招标公告中提炼硬性要求 | 资格 / 技术 / 商务 / 截止时间要求清单 |
| 2 | `parse_document` 文档解析 | 解析我方、每份竞品标书 | 结构化技术参数表（容量、功率、循环寿命、效率、认证等） |
| 3 | `quality_check` 质量自审 | 检查我方标书自身问题 | 缺失项、重复项、异常值 |
| 4 | `requirement_coverage` 覆盖度核查 | 招标要求 vs 我方应答 | 逐条 ✅ 已覆盖 / ❌ 缺失 / ⚠️ 部分满足 |
| 5 | `bid_compare` 竞标对比 | 我方 vs 竞品逐字段对比 | 🔴🟡🟢 差距分级 + 修改建议 |
| 6 | `competitor_match` 对手库匹配 | 无竞品文件时匹配历史标书 | 候选标书 + 匹配度打分 |

前 5 个 Agent 由 `server/src/services/agent/orchestrator.js` 串行编排，状态写入 `agent_runs` 表供前端轮询；Agent 6 在对手标书库缺失时按规则权重（项目类型 / 行业 / 规模 / 技术参数）打分召回。

### 2.2 产品能力

- **对话式主页**：左导航 + 右对话框，输入项目诉求直达工作台
- **项目管理**：项目列表、新建、详情、版本时间线（V1 → V2 → V3）
- **文件管理**：上传招标公告 / 我方标书 / 竞品标书，类型识别、PDF 在线预览
- **竞标对比结果**：4 个 Tab（参数对比 / 差距清单 / 覆盖度 / 修改建议）+ 版本 Diff
- **审批归档**：提交审批（MVP 自动通过）、归档、生成项目总报告并导出 PDF
- **对手标书库**：竞品标书自动入库、智能匹配推荐、采纳 / 忽略
- **管理端**：系统仪表盘、用户管理、项目管理、文件管理、审批管理、权限管理、知识库

---

## 3. 整体架构

```
┌─────────────────────────┐        ┌─────────────────────────┐
│  web-user  用户端 :5173 │        │  web-admin 管理端 :5174 │
│  React18 + antd5 + Vite │        │  React18 + antd5 + Vite │
└───────────┬─────────────┘        └───────────┬─────────────┘
            │  /api  /uploads（Vite 代理）      │
            └───────────────┬──────────────────┘
                            ▼
              ┌───────────────────────────────┐
              │  server  REST API  :3001      │
              │  Express + JWT + multer       │
              │  ┌─────────────────────────┐  │
              │  │ Agent 编排 orchestrator │  │
              │  │ LLM(deepseek) / MockLLM │  │
              │  └─────────────────────────┘  │
              └──────┬─────────────────┬──────┘
                     ▼                 ▼
        ┌────────────────────┐  ┌──────────────────────────┐
        │  MySQL 8.0         │  │ 存储适配器 storageAdapter│
        │  10 张业务表        │  │ local(默认) / MinIO/S3/OSS│
        └────────────────────┘  └──────────────────────────┘
```

| 层级 | 技术 |
|------|------|
| 用户端 / 管理端 | React 18 + TypeScript + Ant Design 5 + Vite 5 + zustand + react-router-dom 6 |
| 后端 | Node.js 18+ + Express 4 + mysql2 + JWT + multer + pdf-parse + mammoth + pdfkit |
| 数据 | MySQL 8.0（库 `bid_demo`，10 张表） |
| 存储 | 本地 `server/storage/uploads`（可切 MinIO / S3 / OSS） |
| LLM | deepseek-chat（OpenAI 兼容协议）+ MockLLM 降级 |

数据库表：`users`、`projects`、`files`、`agent_runs`、`issues`、`approvals`、`project_reports`、`competitor_bid_libraries`、`competitor_bid_entries`、`bid_recommendations`。

---

## 4. 目录结构

```
bid-assistant/
├── README.md                  # 本文件
├── docker-compose.yml         # MySQL + server + 双前端 一键启动
├── package.json               # 根脚本：concurrently 同时拉起三端
├── server/                    # 后端 REST API + Agent 编排
│   ├── src/
│   │   ├── controllers/       # 11 个控制器
│   │   ├── routes/            # 11 组路由
│   │   ├── services/
│   │   │   ├── agent/         # orchestrator / prompts / schemas / 6 个 agent
│   │   │   ├── archive/       # 归档
│   │   │   ├── library/       # 对手标书库智能匹配
│   │   │   ├── report/        # PDF 报告生成
│   │   │   └── storage/       # 存储适配器（local / 云端）
│   │   ├── mock/              # 6 份 Agent Mock JSON + 演示 PDF
│   │   └── db/                # mysql2 连接池
│   ├── scripts/               # migrate / provision / cloud-sync / cloud-restore
│   ├── schema.sql             # 10 张表 DDL
│   └── seed.js                # 种子用户与示例项目
├── web-user/                  # 用户端（投标专员）
├── web-admin/                 # 管理端（管理员）
└── docs/
    ├── prd/                   # 可执行 PRD（主文档 + 8 个模块子 PRD）
    ├── specs/                 # 实现 Spec 01-08
    ├── tickets/               # 开发任务与验收清单
    └── architecture/          # 产品/技术架构图（HTML）
```

各模块的详细说明见： [server/README.md](./server/README.md)、[web-user/README.md](./web-user/README.md)、[web-admin/README.md](./web-admin/README.md)、[docs/README.md](./docs/README.md)。

---

## 5. 快速开始

### 5.1 前置环境

- Node.js **18+**（推荐 20 LTS）
- MySQL **8.0**，或已安装并启动 Docker Desktop（用于 `docker compose` 拉起 MySQL）

### 5.2 方式一：本地开发

```bash
git clone https://github.com/Petrichor1115/bid-assistant.git
cd bid-assistant
```

**① 启动后端**

```bash
cd server
cp .env.example .env          # Windows: copy .env.example .env
npm install
npm run db:provision          # 自动装配 MySQL：云 → Docker → 本地
npm run db:migrate            # 建表（幂等，可重复执行）
npm run seed                  # 5 个种子用户 + 1 个示例项目
npm run dev                   # http://localhost:3001
```

**② 启动前端（另开两个终端）**

```bash
cd web-user
npm install
npm run dev                   # http://127.0.0.1:5173

cd web-admin
npm install
npm run dev                   # http://127.0.0.1:5174
```

**③ 或用根目录一条命令同时拉起三端**

```bash
npm install
npm run dev
```

### 5.3 方式二：Docker 一键启动

```bash
docker compose up -d --build
# 用户端 http://localhost:8080
# 管理端 http://localhost:8081
# 后端   http://localhost:3001
```

容器内会自动执行 `migrate` + `seed`，并以 `LLM_MOCK=true` 启动，无需任何 Key。

### 5.4 默认账号

| 应用 | 用户名 | 密码 |
|------|--------|------|
| 用户端 http://127.0.0.1:5173 | `小林` | `123456` |
| 管理端 http://127.0.0.1:5174 | `系统管理员` | `123456` |

> 登录接口以 `name` 匹配用户；其他种子账号（李技术 / 王法务 / 赵主管）角色不同，仅用于角色与权限演示。

---

## 6. LLM 模式：有 Key 用真模型，无 Key 也能跑

`server/src/services/agent/llmProvider.js` 统一封装调用入口：

- **Mock 模式（默认）**：`LLM_API_KEY` 为空或 `LLM_MOCK=true` 时，读取 `server/src/mock/*.json` 预生成结果，全流程可演示，无需联网
- **真实模式**：填入 `LLM_API_KEY`（deepseek 或任意 OpenAI 兼容服务），并设 `LLM_MOCK=false`，则走 `POST {LLM_BASE_URL}/chat/completions`
- 失败兜底：调用异常时自动回退到 Mock，保证演示不中断

**本项目不会提交任何真实 API Key**，仓库内只提供 `.env.example` 占位。

---

## 7. 文档索引

| 目录 | 内容 |
|------|------|
| [docs/prd](./docs/prd/README.md) | 可执行 PRD：产品概述、功能明细、数据模型、API 契约、Agent 编排、前端规范、验收清单 |
| [docs/prd/modules](./docs/prd/modules) | 8 个模块级子 PRD（对话式主页 / 认证 / 项目 / 对手库 / 竞标对比 / Agent / 报告 / 管理后台） |
| [docs/specs](./docs/specs/README.md) | 实现 Spec 01-08（按序执行即可完成编码） |
| [docs/tickets](./docs/tickets/README.md) | 任务拆解与逐条验收记录 |
| [docs/architecture](./docs/architecture) | 用户端 / 管理端产品架构图、整体技术架构图（分层版与细化版），浏览器直接打开 |

---

## 8. 常见问题

**Q：没有 MySQL，能跑吗？**
用 `docker compose up -d mysql` 或 `npm run db:provision` 自动装配；Docker 不可用时会提示按平台安装 MySQL 8.0。

**Q：上传的 PDF 解析失败？**
`pdf-parse` 对扫描版（图片型）PDF 无效，请使用可复制文本的 PDF；`server/src/mock/pdfs/` 提供了可直接试用的演示文件。

**Q：前端请求 401 / 角色不匹配？**
用户端只接受 `bidder` 角色，管理端只接受 `admin` 角色。请分别用 `小林` 和 `系统管理员` 登录，不要跨端复用 token。

**Q：端口被占用？**
后端改 `server/.env` 的 `PORT`，前端改各自 `vite.config.ts` 的 `server.port`（同时同步代理目标）。

---

## 9. 声明

- 仓库内所有项目名、竞品名、技术参数、认证编号均为**脱敏演示数据**，不代表真实标书内容
- 本项目为产品原型 / 学习演示用途，未经过生产级安全与合规评审，请勿直接用于真实招投标决策
- 未包含任何真实 API Key、账号密码或客户资料

## 10. 许可

[MIT](./LICENSE) © Hedy
