# 04 · API 接口规范

> 本章是后端实现契约。AI 开发者按此实现所有路由/控制器。共 40 个接口。

## 1. 通用约定

- **Base URL**：`http://localhost:3001/api`
- **Content-Type**：JSON（文件上传用 `multipart/form-data`）
- **鉴权**：除 `login`、`health` 外，均需请求头 `Authorization: Bearer <token>`
- **成功响应**：HTTP 200，体：

```json
{ "code": 0, "message": "ok", "data": <payload> }
```

- **错误响应**：HTTP 4xx/5xx，体：

```json
{ "code": 400, "message": "错误描述", "data": null }
```

- **分页**：请求 `?page=1&pageSize=10`，响应 `data = { "list": [], "total": 100, "page": 1, "pageSize": 10 }`

### 1.1 错误码

| HTTP | code | 含义 |
|------|:---:|------|
| 400 | 400 | 参数错误 |
| 401 | 401 | 未登录/token 无效 |
| 403 | 403 | 无权限 |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 状态冲突（如已归档不可改） |
| 422 | 422 | 业务校验失败（如未 AI 跑通不可提交审批） |
| 500 | 500 | 服务器错误 |

---

## 2. 认证 Auth

### POST /api/auth/login
- 鉴权：无
- 请求：`{ "username": "...", "password": "...", "app": "user" | "admin" }`；`app=user` 校验 role=bidder，`app=admin` 校验 role=admin（前端固定传各自 app，无角色下拉）
- 成功：`data = { "token": "<jwt>", "user": { id,name,role,department } }`
- 错误：401 用户名或密码错误 / 账号角色与 app 不匹配（用户端用 admin 账号、或管理端用非 admin 账号均 401）

### GET /api/auth/me
- 鉴权：是
- 成功：`data = { user }`

### POST /api/auth/logout
- 鉴权：是（无状态，前端删除 token）
- 成功：`data = { "message": "ok" }`

---

## 3. 用户 Users（Admin）

### GET /api/users
- 鉴权：admin
- 查询：`page,pageSize,keyword,role`
- 成功：`data = { list: [user], total }`

### POST /api/users
- 鉴权：admin
- 请求：`{ name, password, role, department }`
- 成功：`data = { user }`（password_hash 不返回）

### GET /api/users/:id
### PUT /api/users/:id
- 请求：`{ name?, password?, role?, department? }`
### DELETE /api/users/:id
- 成功：`data = { message: "ok" }`（禁删自己/最后一个 admin）

---

## 4. 项目 Projects

### GET /api/projects
- 查询：`status, keyword, page, pageSize`
- 成功：`data = { list: [project], total }`
- project 结构：

```json
{ "id": "...", "name": "...", "bidder": "...", "deadline": "2026-12-15",
  "region": "德国", "storage_type": "commercial",
  "capacity_mwh": 50, "power_mw": 25, "duration_h": 2, "description": "...",
  "status": "draft", "creator_id": "...", "created_at": "..." }
```

### POST /api/projects
- 鉴权：bidder
- 请求：`{ name(必填), bidder, deadline, region, storage_type, description, capacity_mwh?, power_mw?, duration_h? }`
- 成功：`data = { project }`（status=draft）
- 错误：422 name 为空

### GET /api/projects/:id
- 成功：`data = { project, files: [file], library: {id,entry_count,status}|null }`

### PUT /api/projects/:id
- 请求：`{ name?, bidder?, deadline?, region?, storage_type?, description?, capacity_mwh?, power_mw?, duration_h? }`
- 错误：409 已归档项目不可编辑

### DELETE /api/projects/:id
- 成功：`data = { message: "ok" }`（级联删除文件/运行/问题/审批/报告/库/推荐）

### GET /api/projects/:id/timeline
- 成功：`data = { list: [{ version_no, file_count, agent_status, created_at }] }`

---

## 5. 文件 Files

### POST /api/projects/:id/files
- 鉴权：bidder
- Content-Type：`multipart/form-data`
- 表单字段：`file`（二进制）、`file_type`（announcement|our_bid|competitor_bid）、`version_no`（announcement/our_bid 跟随项目版本；competitor_bid 仅作归档时点标记，不参与版本隔离）
- 成功：`data = { file, archived?: {library, entry} }`
- 业务规则：
  - 若 `file_type = competitor_bid`：**自动归档**（建库/写 entry/建索引，见 05-A8 流程）。
  - 文件保存本地 `storage/uploads/{uuid}.pdf`，`storage_url = /uploads/{uuid}.pdf`。
- 错误：422 文件为空 / 类型非法 / 非 PDF / 单文件超过 50MB / 对手标书超过 20 份

### GET /api/projects/:id/files
- 查询：`version_no, file_type`
- 成功：`data = { list: [file] }`

### GET /api/files/:id
- 鉴权：是（下载，返回文件流，Content-Disposition 附件）

### DELETE /api/files/:id
- 成功：`data = { message: "ok" }`（若为对手标书，级联删 entry 并 -1 entry_count）
- 注意：删除对手标书会通过外键级联删除其库条目（competitor_bid_entries）及关联的对标书推荐记录（bid_recommendations）。

### GET /api/projects/:id/diff
- 查询：`from`（V1）、`to`（V2）
- 成功：`data = { from, to, changes: [{ field, from_value, to_value, change_type }], summary }`

---

## 6. Agent 运行

### POST /api/projects/:id/agent/run
- 鉴权：bidder
- 请求：`{ version_no }`（默认「有 success 运行记录的最大版本号」，无则取项目最大文件版本号）
- 行为：顺序执行 5 个主流程 Agent（1→2→3→4→5），同步/异步均可（MVP 建议异步，前端轮询）
- 成功：`data = { runs: [agent_run] }`

### POST /api/projects/:id/agent/:agentName/run
- 鉴权：bidder
- agentName ∈ 6 个枚举
- 请求：`{ version_no }`
- 成功：`data = { run }`

### GET /api/projects/:id/agent/runs
- 查询：`version_no`
- 成功：`data = { list: [agent_run] }`
- agent_run 结构：`{ id, project_id, version_no, agent_name, status, error_message, started_at, finished_at, duration_ms }`（不含 input_json/output_json）

### GET /api/agent/runs/:runId
- 成功：`data = { run }`（含 input_json/output_json 完整存档）

### POST /api/agent/runs/:runId/retry
- 成功：`data = { run }`（重置为 pending 并重新执行）

---

## 7. 分析结果 Results / Issues

### GET /api/projects/:id/results
- 查询：`version_no`（默认取「有 success 运行记录的最大版本号」；无任何成功运行 → 返回 `version_no=null` + 空结果）、`opponent_file_id`（可选，指定对手标书；默认最新入库一份）
- 成功：`data = { version_no, opponents: [{file_id, company_name}], self_check: [issue], coverage: [coverageItem], bid_gaps: [issue], param_compare: { fields: [...], our: {...}, opponents: [{file_id, company_name, params: {...}}] } }`
- 说明：后端聚合 issues 表 + 最近成功 agent_runs 的 output_json；`bid_gaps` 与 `param_compare.opponents` 按 `opponent_file_id` 过滤（多对手逐份返回）。

### GET /api/projects/:id/issues
- 查询：`category, severity, version_no, page, pageSize`
- 成功：`data = { list: [issue], total }`

### PUT /api/issues/:id
- 请求：`{ is_resolved: 0|1 }`
- 成功：`data = { issue }`

---

## 8. 对手标书库 / 智能匹配

### GET /api/projects/:id/competitor-library
- 成功：`data = { library, entries: [{ id, company_name, industry_domain, project_scale, project_type, index_status, file_id }] }`

### POST /api/projects/:id/competitor-library/match
- 鉴权：bidder
- 请求：`{ version_no }`（可选）
- 行为：触发 Agent6，基于项目 类型/行业/规模/技术参数 四类特征在已有 `competitor_bid_entries` 中匹配（缺哪类特征就降级用哪几类），写入 `bid_recommendations`。
- 成功：`data = { recommendations: [...] }`

### GET /api/projects/:id/competitor-recommendations
- 成功：`data = { list: [{ id, source_entry_id, source_file_id, company_name, match_score, match_features_json, recommendation_reason, status }] }`

### PUT /api/recommendations/:id/adopt
- 行为：`status = adopted`；被采用对标书后续参与 Agent2/Agent5 对比输入。
- 成功：`data = { recommendation }`

### PUT /api/recommendations/:id/dismiss
- 行为：`status = dismissed`
- 成功：`data = { recommendation }`

---

## 9. 审批 Approvals

### POST /api/projects/:id/submit-approval
- 鉴权：bidder
- 请求：`{ version_no }`（默认最新版本）
- 状态前置：项目 `status ∈ {draft,in_progress}`，否则 409。
- 前置校验：该版本 5 个主流程 Agent（parse_announcement/parse_document/quality_check/requirement_coverage/bid_compare）全部 `status=success`，否则 422「未完成 AI 分析，无法提交审批」；**Agent6 不纳入校验**。
- 行为：自动生成 3 条 approvals（tech_lead → legal → bid_director，均 approved、auto_approved=1），项目状态 → `awaiting_approval` → `approved`。
- 成功：`data = { approvals: [...], project_status: "approved" }`

### GET /api/projects/:id/approvals
- 成功：`data = { list: [approval] }`

---

## 10. 报告 Reports

### POST /api/projects/:id/archive
- 鉴权：bidder
- 状态前置：项目 `status=approved`，否则 409。
- 行为：汇总版本/问题/耗时 → 生成 `project_reports`（final_summary 可由 LLM 生成，降级用模板拼装）→ 项目状态 → `archived`。
- 成功：`data = { report }`

### GET /api/projects/:id/report
- 成功：`data = { report }`（含 version_history_json、issue_statistics_json 解析后对象）

### GET /api/projects/:id/report/pdf
- 行为：用 pdfkit 生成 PDF 下载（报告数据 + 图表用文字/表格呈现）。
- 成功：文件流

---

## 11. 仪表盘 Dashboard

### GET /api/dashboard
- 成功：`data = { status_cards: { draft, in_progress, awaiting_approval, archived }, todos: [...], recent_activities: [...] }`

### GET /api/admin/dashboard
- 鉴权：admin
- 成功：`data = { project_total, agent_run_total, agent_success_rate, storage_used_bytes }`

---

## 12. 健康检查

### GET /api/health
- 鉴权：无
- 成功：`data = { status: "ok", db: "mysql", llm: "mock" | "ready", storage: "local" | "cloud" }`
