# ADR · 决策歧义 ADR（架构决策记录）

> 用途：记录总 PRD 与子 PRD 中所有曾存在歧义、现已拍板的决策，避免后续开发再次摇摆。每条含：背景 / 决策 / 理由 / 影响。
> 状态约定：`已采纳`（落地）、`提议`（待定）。未特殊标注均为 `已采纳`。

## 1. 数据与存储决策

### ADR-001 数据库引擎：SQLite → MySQL 8.0
- **背景**：初版为"本地 SQLite 直接开发"，后明确"本地存储需用 MySQL，无则自动安装"。
- **决策**：统一 MySQL 8.0（≥8.0.16），驱动 `mysql2`，库 `bid_demo`。
- **理由**：与"云端优先、本地 MySQL 兜底"存储策略一致；SQLite 无法满足云端同步与关系约束需求。
- **影响**：DDL 全部重写为 MySQL；`03-数据模型与SQLite设计.md` 已废弃，替换为 `03-数据模型与MySQL设计.md`。

### ADR-002 对象存储：本地 + Docker 卷 + 云端对象存储
- **背景**：原 MinIO → 本地文件系统 → 需"数据保存到 Docker"。
- **决策**：上传文件本地落盘 + Docker 卷 `uploads-data` 持久化；云端经 `cloud-sync` 上传对象存储（S3/OSS/MinIO）。
- **理由**：免 Docker 依赖可本地开发，同时满足数据上云。
- **影响**：`STORAGE_DRIVER=local|minio`（文件）；`CLOUD_STORAGE_DRIVER=s3|oss|minio`（dump）。

### ADR-003 PDF 解析：Python → Node pdf-parse
- **背景**：原架构用 pdfplumber/PyMuPDF（Python），与 Node 后端跨语言。
- **决策**：改 `pdf-parse`（Node），单语言栈。
- **影响**：`source_page` 页码拿不到 → 见 ADR-014。

### ADR-004 LLM 调用：deepseek + MockLLM 降级
- **决策**：`deepseek-chat` 为主；无 Key/超时/失败自动降级 MockLLM 读预生成 JSON。
- **理由**：保证本地零 Key 可演示全流程。

### ADR-009 数据存储三级策略（云 → 本地 → 自动安装）
- **决策**：①`CLOUD_DB_URL` 直连云 MySQL；②Docker 部署 MySQL 并 `mysqldump` 定时上云；③本地 MySQL；④无 MySQL 则 `db:provision` 自动安装（Docker 镜像优先，其次 winget/brew/apt）。
- **影响**：新增 `scripts/provision-db.js / cloud-sync.js / cloud-restore.js`。

### ADR-019 云端对象存储 SDK 选型
- **决策**：`s3`→`@aws-sdk/client-s3`（含 S3 兼容）；`oss`→`ali-oss`；`minio`→`minio`；`services/storage/cloudStorage.js` 驱动抽象，未配置返回 null 禁用。

## 2. Agent 编排决策

### ADR-005 实时状态：前端轮询（非 WebSocket）
- **决策**：前端 1~2s 轮询 `GET /api/projects/:id/agent/runs`。
- **理由**：免 WebSocket/Redis 基础设施。

### ADR-010 版本语义：以我方标书驱动
- **决策**：创建=1；「上传新版本」=+1；announcement/our_bid 跟随；competitor_bid 仅作归档时点标记，跨版本共享。
- **影响**：agent_runs/issues/approvals.version_no 均指我方标书版本。

### ADR-011 多对手对比：逐份执行 + 前端切换
- **决策**：Agent2 对手逐份解析、Agent5（bid_compare）逐份对比（每份一个 run）；竞标对比结果页/参数对比表按 `opponent_file_id` 切换，默认最新归档一份。

### ADR-012 一键跑范围：5 主流程，Agent6 按需
- **决策**：「一键跑全流程」= 5 主流程 Agent（1→2→3→4→5）；Agent6 在无对手标书/手动时按需触发。
- **理由**：Agent6 依赖项目特征与库数据，非每次必跑。

### ADR-013 「AI 跑通」校验口径：Agent6 不纳入
- **决策**：提交审批前置校验 = 5 主流程 Agent 全 success，**Agent6 不纳入**；默认提交最新版本；项目 status 须 ∈{draft,in_progress}。

### ADR-014 source_page：MVP 置 null
- **决策**：`pdf-parse` 不分页，Agent1 输出 `source_page=null`，取消页码承诺。

### ADR-015 issues 幂等：跑前删除旧记录
- **决策**：每次 Agent 执行/重试前，删除该项目该 version 下同 `source_agent` 的旧 issues 再写（事务内），保证重跑不重复。

### ADR-016 results 回退语义
- **决策**：`GET /results` 默认取「有 success 运行记录的最大 version_no」；无任何成功运行返回 `version_no=null` + 空结果。

### ADR-017 进程重启兜底
- **决策**：服务启动时将 `status='running'` 的 agent_runs 置为 `failed`（error_message='服务重启中断，请重试'）。

## 3. 业务规则决策

### ADR-006 鉴权：JWT + 5 种子用户 + 双应用登录
- **决策**：`jsonwebtoken` 签发；种子 5 用户（bidder/tech_lead/legal/bid_director/admin），密码 123456（bcrypt）；用户端登录固定校验 bidder、管理端登录固定校验 admin（均无角色下拉）。

### ADR-007 审批流：三级硬编码自动通过
- **决策**：提交审批后自动生成 3 条 approvals（tech_lead→legal→bid_director，decision=approved, auto_approved=1），无独立审批页面；rejected 状态保留但不触发。

### ADR-008 报告导出：pdfkit
- **决策**：`pdfkit` 生成 PDF；`final_summary` 无 LLM 时用固定模板拼装。

### ADR-020 术语消歧：「归档」分义
- **决策**：对手标书归档称「**入库/收录**」；项目归档称「**项目归档/封存**」。全文档按此口径（见 context.md C1）。

### ADR-021 历史标书库边界
- **决策**：MVP 只实现项目级对手标书库（A8 自动收录）；D2 全局管理端浏览/筛选为 PPT 规划项。

### ADR-022 bidder 字段语义：招标方，非投标人
- **决策**：`projects.bidder` 语义为「招标方（发标方）」；`users.role='bidder'` 语义为「投标专员」。MVP 保留字段名并注释澄清，前端文案统一显示"招标方"；后续可改名 `tenderer`。

## 4. 前端与部署决策

### ADR-018 前端 Docker 化：双应用 nginx 托管，端口 8080/8081
- **决策**：web-user/web-admin 均多阶段构建（node build → nginx 托管 dist），`nginx.conf` 将 `/api`、`/uploads` 反代到 `server:3001`；宿主机端口 `8080:80`（用户端）、`8081:80`（管理端）。

### ADR-023 应用形态：用户端 + 管理端双前端
- **决策**：单仓库两个独立前端应用 `web-user`（用户端）与 `web-admin`（管理端），共享同一 `server`、MySQL `bid_demo` 与 JWT 账号体系。

### ADR-024 首页：对话式主页
- **决策**：用户端登录后落地对话式主页 `/`（左侧导航 + 右侧对话框）；原个人仪表盘 `/dashboard` 并入项目工作台 `/workspace/dashboard`。

### ADR-025 非 MVP 功能：置灰 / 写死
- **决策**：置灰 = 视觉置灰、可点击、点击弹 Toast「敬请期待」；写死 = 前端硬编码静态渲染、不可交互。标讯追踪/招标解读/标书生成/标书审查/新建对话/对话记录/上传按钮/快捷按钮（除「我的项目」）= 置灰；标讯推荐 5 卡片 = 写死。

### ADR-026 命名统一：竞标对比
- **决策**：`competitor_compare→bid_compare`、`competitor_gap→bid_gap`、`competitor_gap_count→bid_gap_count`、`competitor_gaps→bid_gaps`（API 响应）、`CompareResult→BidCompareResult`、前端路由 `/results→/compare`；`competitor_bid*` / `competitor_match` 保留不动。

## 5. 决策状态索引

| ADR | 标题 | 状态 |
|-----|------|:---:|
| 001~019 | 见上文 | 已采纳 |
| 022 后续改名 tenderer | 字段改名 | 提议（MVP 不改） |
| 023~026 | 双应用 / 对话式主页 / 置灰写死 / 竞标对比命名 | 已采纳 |
