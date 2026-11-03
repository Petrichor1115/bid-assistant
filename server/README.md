# server · 后端服务

投标智能助手的 REST API 与 Agent 编排服务，单进程 Node.js + Express + MySQL。

## 1. 职责

- 提供 40+ 接口：认证、项目、文件、Agent 编排、对手标书库、结果与问题、审批、报告、仪表盘、管理端
- 统一响应信封：成功 `{ code: 0, message: "ok", data }`，失败 `{ code, message, data: null }`
- JWT 鉴权（`Authorization: Bearer <token>`，有效期 7 天），角色守卫（`bidder` / `admin`）
- 文件上传与文本抽取：PDF（`pdfjs-dist` legacy）、DOCX（`mammoth`）
- 6 个 Agent 的编排、状态落库与轮询查询
- PDF 报告生成（`pdfkit`）

## 2. 目录结构

```
server/
├── src/
│   ├── index.js               # 进程入口：启动、中断运行恢复
│   ├── app.js                 # Express 装配、路由挂载、404 与错误处理
│   ├── config.js              # 环境变量集中读取（.env）
│   ├── db/index.js            # mysql2 连接池单例
│   ├── controllers/           # 业务控制器（11 个）
│   ├── routes/                # 路由（11 组）
│   ├── middleware/            # auth（JWT + 角色）、errorHandler
│   ├── services/
│   │   ├── agent/
│   │   │   ├── orchestrator.js     # Agent 串行编排 + 中断恢复
│   │   │   ├── llmProvider.js      # LLM / MockLLM 统一入口
│   │   │   ├── prompts.js          # 各 Agent Prompt
│   │   │   ├── schemas.js          # 输出 JSON Schema 校验
│   │   │   ├── rules.js            # 规则兜底（阈值、匹配权重）
│   │   │   ├── pdfExtractor.js     # PDF / DOCX 文本抽取
│   │   │   └── agents/             # agent1~agent6
│   │   ├── library/matchService.js # 对手标书库召回打分
│   │   ├── archive/archiveService.js
│   │   ├── report/reportGenerator.js
│   │   └── storage/                # local 适配器 + 云端对象存储
│   ├── mock/                  # 6 份 Agent Mock JSON + 演示 PDF
│   └── utils/response.js
├── scripts/                   # migrate / provision-db / cloud-sync / cloud-restore / 生成 mock PDF
├── schema.sql                 # 10 张表 DDL（幂等）
├── seed.js                    # 种子用户 + 示例项目
├── Dockerfile
└── .env.example
```

## 3. 依赖环境

- Node.js 18+（使用内置 `fetch`、`AbortSignal.timeout`）
- MySQL 8.0（库名默认 `bid_demo`）
- 可选：Docker（`npm run db:provision` 可自动拉起 MySQL）、MinIO/S3/OSS（云端对象存储同步）

## 4. 环境变量

复制 `.env.example` 为 `.env` 后按需修改：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥，生产环境务必替换 |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL 地址 |
| `DB_USER` / `DB_PASSWORD` | `root` / `root123456` | MySQL 账号 |
| `DB_NAME` | `bid_demo` | 库名 |
| `CLOUD_DB_URL` | 空 | 配置后优先直连云 MySQL（RDS），跳过本地装配 |
| `STORAGE_DIR` | `./storage/uploads` | 本地上传目录 |
| `STORAGE_DRIVER` | `local` | `local` / `minio` |
| `CLOUD_STORAGE_DRIVER` | 空 | `s3` / `oss` / `minio`，留空则不启用云端同步 |
| `CLOUD_ENDPOINT` / `CLOUD_BUCKET` / `CLOUD_ACCESS_KEY` / `CLOUD_SECRET_KEY` | 空 | 云端对象存储连接信息 |
| `LLM_API_KEY` | 空 | 留空即启用 Mock 模式 |
| `LLM_BASE_URL` | `https://api.deepseek.com` | OpenAI 兼容服务地址 |
| `LLM_MODEL` | `deepseek-chat` | 模型名 |
| `LLM_MOCK` | `true` | `true` 强制 Mock；`false` 且有 Key 时调用真实模型 |
| `LLM_TIMEOUT_MS` | `30000` | 单次模型调用超时 |

> 仓库内不包含任何真实 Key，`.env` 已被 `.gitignore` 排除。

## 5. 快速启动

```bash
cd server
cp .env.example .env      # Windows: copy .env.example .env
npm install
npm run db:provision      # 云 MySQL → Docker → 本地，依次尝试
npm run db:migrate        # 建表
npm run seed              # 种子数据
npm run dev               # http://localhost:3001
```

健康检查：

```bash
curl http://localhost:3001/api/health
# {"code":0,"message":"ok","data":{"status":"ok","db":"mysql","llm":"mock","storage":"local"}}
```

## 6. 脚本

| 脚本 | 作用 |
|------|------|
| `npm run dev` / `npm start` | 启动服务（`node src/index.js`） |
| `npm run db:provision` | 自动装配 MySQL（云 → Docker → 本地 → 安装提示） |
| `npm run db:migrate` | 执行 `schema.sql`（幂等，可重复执行） |
| `npm run seed` | 插入 5 个种子用户与 1 个示例项目 |
| `npm run cloud:sync` | 将 MySQL dump 上传到云端对象存储 |
| `npm run cloud:restore` | 从云端对象存储恢复数据 |

## 7. API 一览

响应信封统一为 `{ code, message, data }`，除 `GET /api/health` 与 `POST /api/auth/login` 外均需 Bearer Token。

| 分组 | 方法与路径 |
|------|-----------|
| 探活 | `GET /api/health` |
| 认证 | `POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout` |
| 用户 | `GET/POST /api/users`、`GET/PUT/DELETE /api/users/:id` |
| 项目 | `GET/POST /api/projects`、`GET/PUT/DELETE /api/projects/:id`、`GET /api/projects/:id/timeline`、`GET /api/projects/:id/diff` |
| 文件 | `POST/GET /api/projects/:id/files`、`GET/DELETE /api/files/:id`、`POST /api/files/identify`、`POST /api/projects/:id/modify-bid` |
| Agent | `POST /api/projects/:id/agent/run`、`POST /api/projects/:id/agent/:name/run`、`GET /api/projects/:id/agent/runs`、`GET /api/agent/runs/:runId`、`POST /api/agent/runs/:runId/retry` |
| 对手标书库 | `GET /api/projects/:id/competitor-library`、`POST /api/projects/:id/competitor-library/match`、`GET /api/projects/:id/competitor-recommendations`、`PUT /api/recommendations/:id/adopt`、`PUT /api/recommendations/:id/dismiss` |
| 结果与问题 | `GET /api/projects/:id/results`、`GET /api/projects/:id/results/pdf`、`GET /api/projects/:id/issues`、`PUT /api/issues/:id` |
| 审批 | `POST /api/projects/:id/submit-approval`、`GET /api/projects/:id/approvals` |
| 报告与归档 | `POST /api/projects/:id/archive`、`GET /api/projects/:id/report`、`GET /api/projects/:id/report/pdf` |
| 仪表盘 | `GET /api/dashboard`、`GET /api/admin/dashboard`、`GET /api/admin/files`、`GET /api/admin/approvals` |

完整请求/响应契约见 [docs/prd/04-API接口规范.md](../docs/prd/04-API接口规范.md)。

## 8. Agent 编排

```
POST /projects/:id/agent/run
  └─ orchestrator.runAll()
       ├─ 1. parse_announcement      → 招标硬性要求清单
       ├─ 2. parse_document          → 我方 / 竞品结构化参数
       ├─ 3. quality_check           → 自审问题（写入 issues/self_check）
       ├─ 4. requirement_coverage    → 覆盖度裁决（写入 issues/requirement_gap）
       └─ 5. bid_compare             → 差距分级 + 建议（写入 issues/bid_gap）
```

- 每个 Agent 的运行以 `agent_runs` 一行记录，状态 `pending → running → succeeded / failed`，前端 1~2s 轮询
- 进程重启时 `recoverInterruptedRuns()` 把残留 `running` 置为 `failed`，可 `POST /agent/runs/:runId/retry`
- Agent 输出先经 `schemas.js` 校验，异常时由 `rules.js` 规则兜底
- `competitor_match`（Agent 6）在竞品标书缺失时由 `library/matchService.js` 按权重召回历史标书，无需手动触发

## 9. LLM 与 Mock

`src/services/agent/llmProvider.js`：

- `isMock()`：`LLM_MOCK=true` 或 `LLM_API_KEY` 为空 → 读取 `src/mock/agent{1..6}.json`
- 真实调用：`POST {LLM_BASE_URL}/chat/completions`，`temperature` 默认 0.2，`max_tokens` 默认 2000，失败重试 1 次后回退 Mock
- `chat()` 返回 JSON 字符串并做 `JSON.parse` 校验，`chatRaw()` 返回原始文本（用于修改说明）

Mock 模式覆盖完整演示链路，无需 Key、无需外网即可体验全部页面。

## 10. 存储

- 默认 `storageAdapter` 落盘到 `STORAGE_DIR`，对外通过 `/uploads/{uuid}` 静态访问
- `cloudStorage.js` 支持 S3 / OSS / MinIO，配合 `cloud:sync` / `cloud:restore` 做备份与迁移
- 上传目录与 `.env` 均不进入版本库

## 11. Docker

```bash
# 仅数据库
docker compose up -d mysql

# 后端 + MySQL
docker compose up -d --build server
```

`Dockerfile` 基于 `node:18-alpine`（额外安装 `mysql-client` 供 dump 使用），启动命令由 compose 指定为 `migrate && seed && node src/index.js`。
