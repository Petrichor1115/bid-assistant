# Tickets · Spec 05 Agent 编排与智能匹配

> 来源：`docs/specs/05-Agent编排与智能匹配.md`（里程碑 M4/M5，依赖 Spec 02、04）
> 本模块最复杂，按「基础能力 → 6 Agent → 编排 → 入库/匹配 → 路由 → 联调」拆 12 票。

## 票据总览

| ID | 标题 | 依赖 | 优先级 |
|:---:|------|------|:---:|
| T01 | 基础能力：pdfExtractor + llmProvider（含 mock 降级） | Spec04 | P0 |
| T02 | 公共资源：prompts.js + schemas.js + rules.js | T01 | P0 |
| T03 | Agent1 招标公告解析 | T02 | P0 |
| T04 | Agent2 文档解析（我方 + 对手逐份） | T02 | P0 |
| T05 | Agent3 质量自审 + Agent4 招标要求覆盖度 | T03,T04 | P0 |
| T06 | Agent5 竞标对比分析（逐份 + 分级） | T04 | P0 |
| T07 | orchestrator：编排/重试/落库幂等/重启兜底 | T03~T06 | P0 |
| T08 | archiveService：对手标书入库（A8） | T01,T02 | P0 |
| T09 | Agent6 + matchService：智能匹配推荐（A9） | T08 | P0 |
| T10 | mock 数据：3 标书 + 预生成输出 JSON | T01 | P0 |
| T11 | 路由挂载：agent/库/推荐接口 | T07,T08,T09 | P0 |
| T12 | Agent 编排联调验证 | T07,T10,T11 | P0 |

---

## T01 · 基础能力：pdfExtractor + llmProvider（含 mock 降级）

- **描述**：实现 PDF 文本提取与 LLM 调用统一入口（deepseek + mock 降级）。
- **交付物**：`server/src/services/agent/pdfExtractor.js`、`server/src/services/agent/llmProvider.js`
- **要点**：
  - `pdfExtractor.extractPdfText(filePath)`：`pdf-parse` → 空文本抛「PDF 无文本（可能为扫描件）」
  - `llmProvider.chat(messages,{temperature,maxTokens})`：`getProvider()` 有 Key 且 `LLM_MOCK!=true` → Deepseek；否则 Mock 读 `mock/{agent}.json`
  - JSON 解析失败重试 1 次，再失败抛错
- **验收**：电子 PDF 可提取文本；无 Key 走 Mock 返回 JSON。
- **依赖**：Spec 04（文件存储路径）

## T02 · 公共资源：prompts.js + schemas.js + rules.js

- **描述**：沉淀 6 个 System Prompt、输出 JSON 校验、分级/匹配规则。
- **交付物**：`server/src/services/agent/{prompts,schemas,rules}.js`
- **要点**：
  - prompts：6 个（公告解析/文档抽取/自审/覆盖/对比/匹配）
  - schemas：校验各 Agent 输出结构，字段缺失容错
  - rules：分级规则（缺认证/寿命低30%+/报价高20%+→red；效率低1%/质保少2年→yellow）；匹配特征权重 `project_type 0.3 > industry_domain 0.2 > scale 0.25 > tech 0.25`，缺失降级；Top5；阈值 0.5
- **验收**：prompts 完整；schema 校验可用；规则函数可单测。
- **依赖**：T01

## T03 · Agent1 招标公告解析（parse_announcement）

- **描述**：公告 PDF → 硬性要求清单。
- **交付物**：`server/src/services/agent/agents/agent1.parseAnnouncement.js`
- **要点**：输入公告文本；输出 `{requirements:[{category,item,is_mandatory,source_page:null}]}`；分类限「技术参数/资质认证/商务条款/截止日期」；不落 issues，供 Agent4。
- **验收**：返回合法 requirements；source_page 恒为 null。
- **依赖**：T02

## T04 · Agent2 文档解析（parse_document）

- **描述**：我方/对手标书 → 统一 schema 结构化字段。
- **交付物**：`server/src/services/agent/agents/agent2.parseDocument.js`
- **要点**：我方一份；**对手逐份各一次 run**；输出含 `company_name/technical_params/commercial_terms/qualifications/pricing`；存 `agent_runs.output_json`。
- **验收**：我方/每份对手分别产出合法结构化 JSON。
- **依赖**：T02

## T05 · Agent3 质量自审 + Agent4 招标要求覆盖度

- **描述**：自审（规则+LLM）与覆盖度（逐条匹配）。
- **交付物**：`agents/agent3.qualityCheck.js`、`agents/agent4.requirementCoverage.js`
- **要点**：
  - Agent3：规则校验（cycle_life<3000、效率95~99、欧市缺 CE/IEC、报价<0.1、必填 null）→ LLM 补充 → `{issues:[{type,field,current_value,severity,suggestion}]}` 落 `issues(self_check)`
  - Agent4：`{coverage:[{req_item,category,our_status,evidence}]}`，落 `issues(requirement_gap)`，severity 映射 missing→red/not_met→yellow/covered 不落
- **验收**：自审/覆盖输出合法，落库分类正确。
- **依赖**：T03、T04

## T06 · Agent5 竞标对比分析（bid_compare）

- **描述**：我方 vs 单份对手 → 分级差距。
- **交付物**：`agents/agent5.bidCompare.js`
- **要点**：输入我方 JSON + 单份对手 JSON（**逐份各一次 run**）；输出 `{gaps:[{field,category,our_value,opponent_value,severity,gap_description,suggestion}]}`；按 rules 分级；落 `issues(bid_gap)`。
- **验收**：每份对手各产生独立 gap 集合，分级正确。
- **依赖**：T04

## T07 · orchestrator：编排/重试/落库幂等/重启兜底

- **描述**：实现 runAll(5 主流程)/单跑/重试/输入输出存档/issues 幂等/重启兜底。
- **交付物**：`server/src/services/agent/orchestrator.js`
- **要点**：
  - `MAIN=[parse_announcement,parse_document,quality_check,requirement_coverage,bid_compare]` 顺序执行，`ctx` 传递上游输出
  - `runWithRetry`：3 次尝试，`input_json/output_json` 存档，`duration_ms` 记录
  - `persistIssues`：**先删同 version+source_agent 旧 issues 再写（事务）**
  - 启动时：`UPDATE agent_runs SET status='failed',error_message='服务重启中断，请重试' WHERE status='running'`
- **验收**：一键跑 5 Agent 依次 success；重跑无重复 issues；重启后 running→failed。
- **依赖**：T03~T06

## T08 · archiveService：对手标书入库（A8）

- **描述**：对手标书上传后自动入库。
- **交付物**：`server/src/services/archive/archiveService.js`
- **要点**：建库检查（无则建 `competitor_bid_libraries`）→ 元数据抽取（轻量 LLM）→ 写 entry（indexing）→ feature_vector 建立 → indexed → `entry_count+1`；失败 entry 置 failed。
- **验收**：上传对手标书后库条目 +1、indexed；索引失败不影响入库。
- **依赖**：T01、T02、Spec 04 T05（钩子）

## T09 · Agent6 + matchService：智能匹配推荐（A9）

- **描述**：无对手标书时按四类特征匹配推荐同类对标书。
- **交付物**：`agents/agent6.competitorMatch.js`、`server/src/services/library/matchService.js`
- **要点**：特征提取（`project_type > industry_domain > project_scale > technical_params`，缺失降级）→ 库内相似度计算 → LLM 排序+理由 → 写 `bid_recommendations(recommended)`，Top5、阈值 0.5；`adopt` 后该对标书进入 Agent2/Agent5 对比输入。
- **验收**：返回 Top5 推荐（得分+理由）；库空/低于阈值返回空；采用状态正确。
- **依赖**：T08

## T10 · mock 数据：3 标书 + 预生成输出 JSON

- **描述**：生成兜底数据，保证无 LLM Key 可演示。
- **交付物**：`server/src/mock/{agent1..agent6}.json` + 3 份电子 PDF（可用 pdfkit 生成）
- **要点**：德国 50MWh 工商业储能（我方沃泰 / 对手 Tesla）；Agent 输出 JSON 与 PRD 09 一致。
- **验收**：无 Key 时全流程读 mock 跑通。
- **依赖**：T01

## T11 · 路由挂载：agent/库/推荐接口

- **描述**：挂载 Agent 运行、对手标书库、推荐相关接口。
- **交付物**：`server/src/routes/agent.js`、`server/src/routes/library.js`
- **要点**：`POST /projects/:id/agent/run`、`POST /projects/:id/agent/:name/run`、`GET /projects/:id/agent/runs`、`GET /agent/runs/:runId`、`POST /agent/runs/:runId/retry`、`GET/POST /projects/:id/competitor-library[/match]`、`GET /projects/:id/competitor-recommendations`、`PUT /recommendations/:id/adopt|dismiss`。
- **验收**：接口可调用、鉴权正确。
- **依赖**：T07、T08、T09

## T12 · Agent 编排联调验证

- **描述**：端到端验证编排、降级、入库、匹配。
- **交付物**：验证记录（`docs/tickets/verify-05.md`）
- **验收**（对应 Spec 05 §9）：
  1. 一键跑 5 主流程依次 success，输入/输出存档，issues 无重复
  2. 无 Key：Mock 全流程可跑通；单 Agent 失败可重试
  3. 上传对手标书自动入库（indexed）；无对手标书匹配返回 Top5；采用后参与对比
- **依赖**：T07、T10、T11
