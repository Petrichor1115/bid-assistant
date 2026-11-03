# 05 · Agent 编排与 Prompt 设计

> 本章是系统核心，AI 开发者据此实现 Agent 层。含：Orchestrator、LLM Provider、PDF 提取、6 个 Agent 的完整设计、归档/匹配流程、异常处理。

## 1. 总体架构

```
Orchestrator（编排中心）
  ├── 调度 5 个主流程 Agent（1→2→3→4→5）+ Agent6（按需）
  ├── 汇总结果 → 写入 issues / bid_recommendations
  ├── 状态汇报（写 agent_runs.status，前端轮询）
  └── 失败自动重试（默认 3 次）
```

**文件组织**：

```
server/src/services/agent/
├── orchestrator.js        # 调度、重试、状态
├── llmProvider.js         # deepseek + mock 降级
├── pdfExtractor.js        # pdf-parse 文本提取
├── agents/
│   ├── agent1.parseAnnouncement.js
│   ├── agent2.parseDocument.js
│   ├── agent3.qualityCheck.js
│   ├── agent4.requirementCoverage.js
│   ├── agent5.bidCompare.js
│   └── agent6.competitorMatch.js
├── prompts.js             # 全部 System Prompt
├── schemas.js             # 输出 JSON schema 校验
└── rules.js               # 规则/阈值
```

---

## 2. Orchestrator 设计

### 2.1 主工作流（runAll）

```js
async function runAll(projectId, versionNo) {
  const agents = [
    'parse_announcement',   // Agent1
    'parse_document',       // Agent2
    'quality_check',        // Agent3
    'requirement_coverage', // Agent4
    'bid_compare'           // Agent5
  ];
  const results = {};
  for (const name of agents) {
    results[name] = await runAgentWithRetry(name, projectId, versionNo, results);
  }
  return results;
}

async function runAgentWithRetry(name, projectId, versionNo, ctx) {
  const run = createAgentRun(name, projectId, versionNo); // status=pending
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      updateRun(run.id, { status: 'running', started_at: now() });
      const input = buildInput(name, projectId, versionNo, ctx);
      updateRun(run.id, { input_json: JSON.stringify(input) });
      const output = await agents[name](input);   // 调用 LLM 或 mock
      validateOutput(name, output);
      updateRun(run.id, { status: 'success', output_json: JSON.stringify(output),
                           finished_at: now(), duration_ms: elapsed(run) });
      persistIssues(name, projectId, versionNo, output); // 幂等：先删同 version+source_agent 旧 issues 再写
      return output;
    } catch (e) {
      if (attempt === 3) {
        updateRun(run.id, { status: 'failed', error_message: e.message, finished_at: now() });
        throw e;
      }
    }
  }
}
```

### 2.2 依赖关系

| Agent | 依赖上游输出 |
|-------|------------|
| Agent1 | 招标公告文件文本 |
| Agent2 | 我方/对手标书文件文本（含被采用对标书） |
| Agent3 | Agent2 我方 JSON |
| Agent4 | Agent1 要求清单 + Agent2 我方 JSON |
| Agent5 | Agent2 我方 JSON + 对手 JSON（**逐份对手各执行一次**） |
| Agent6 | 项目特征 + competitor_bid_entries（独立触发） |

> MVP 串行 1→2→3→4→5；Agent1/Agent2 无依赖，未来可并行。

### 2.3 上下文传递

- 上游输出存 `agent_runs.output_json`；下游 `buildInput` 读取同 `version_no` 最近一次 success 记录。

---

## 3. LLM Provider（llmProvider.js）

```js
// 两种实现，统一接口 chat(messages, {temperature, maxTokens}) -> string
class DeepseekProvider { /* fetch OpenAI 兼容接口 */ }
class MockProvider     { /* 读 mock/*.json 按 agent 返回 */ }

function getProvider() {
  if (process.env.LLM_API_KEY && process.env.LLM_MOCK !== 'true') return new DeepseekProvider();
  return new MockProvider();
}
```

- DeepSeek API：`POST https://api.deepseek.com/chat/completions`，`Authorization: Bearer <LLM_API_KEY>`，model `deepseek-chat`。
- 调用失败/超时（默认 30s）：自动降级 MockProvider。
- **JSON 解析**：LLM 返回后提取首个 `{...}`，`JSON.parse` 失败 → 重试一次 → 仍失败抛错（记录 failed）。

---

## 4. PDF 文本提取（pdfExtractor.js）

```js
const pdf = require('pdf-parse');
async function extractPdfText(filePath) {
  const data = await pdf(fs.readFileSync(filePath));
  const text = data.text.trim();
  if (!text) throw new Error('PDF 无文本（可能为扫描件）');
  return text;
}
```

- 输入：本地文件路径；输出：纯文本字符串。
- 扫描件空文本 → 抛错 → Agent failed（提示生产环境扩展 OCR）。

---

## 5. 六个 Agent 完整设计

### 5.1 Agent1 招标公告解析（parse_announcement）

- **输入**：招标公告 PDF 文本（`pdf-parse` 不分页，`source_page` 在 MVP 置 `null`）
- **输出 Schema**：

```json
{ "requirements": [
  { "category": "技术参数|资质认证|商务条款|截止日期",
    "item": "描述",
    "is_mandatory": true,
    "source_page": null }
] }
```

- **System Prompt**：

```
你是储能招投标领域的标书解析专家。从给定的招标公告文本中提取所有硬性要求，
按分类整理为 JSON。分类仅限：技术参数、资质认证、商务条款、截止日期。
is_mandatory=true 表示强制条款。只输出 JSON，不要额外解释。
典型储能要求示例：电池类型 LFP、循环寿命≥6000次、逆变器效率≥97.5%、
IEC 62619/CE/VDE-AR-N 4105 认证、质保≥10年。
```

- **落库**：requirements → 不直接落 issues；供 Agent4 使用。

### 5.2 Agent2 文档解析（parse_document）

- **输入**：我方/对手标书 PDF 文本（我方一份；**对手逐份调用**，每份一个 run；含被采用对标书）
- **输出 Schema**：

```json
{ "company_name": "...",
  "technical_params": {
    "battery_type": "LFP|NMC", "rated_capacity_kwh": 0, "rated_power_kw": 0,
    "storage_duration_h": 0, "cycle_life": 0, "inverter_efficiency": 0.0,
    "system_efficiency": 0.0, "energy_density_whl": 0, "dod": 0,
    "warranty_years": 0, "certifications": [], "ems_integrated": false,
    "bms_type": "", "install_type": "", "grid_mode": ""
  },
  "commercial_terms": {}, "qualifications": {}, "pricing": {
    "total_price_eur": 0, "price_per_wh_eur": 0.0 }
}
```

- **System Prompt**：

```
你是储能标书结构化抽取器。将给定标书文本按统一 schema 提取字段，数值只填数字，
未知字段填 null。certifications 为数组。只输出 JSON，不要额外解释。
```

- **落库**：我方 JSON 与对手 JSON 分别存 `agent_runs.output_json`。

### 5.3 Agent3 质量自审（quality_check）

- **输入**：Agent2 我方 JSON
- **输出 Schema**：

```json
{ "issues": [
  { "type": "missing|duplicate|abnormal", "field": "字段key",
    "current_value": "当前值或 null", "severity": "red|yellow|green",
    "suggestion": "修改建议" }
] }
```

- **规则校验（硬编码 rules.js，先于 LLM）**：

| 规则 | 判定 | 严重度 |
|------|------|:---:|
| cycle_life < 3000 | 异常 | yellow |
| inverter_efficiency 不在 95~99 | 异常 | yellow |
| 欧洲市场缺 CE/IEC 认证 | 缺失 | red |
| price_per_wh_eur < 0.1 | 异常 | yellow |
| 必填字段为 null | 缺失 | yellow |

- **System Prompt**：对规则之外的合理性做补充判断（报价异常低、参数遗漏）。
- **⚠️ 非强制**：结果仅为建议，不阻断后续流程与提交审批。
- **落库**：issues 表 `category=self_check`，`source_agent=quality_check`。

### 5.4 Agent4 招标要求覆盖度（requirement_coverage）

- **输入**：Agent1 requirements + Agent2 我方 JSON
- **输出 Schema**：

```json
{ "coverage": [
  { "req_item": "循环寿命≥6000次", "category": "技术参数",
    "our_status": "covered|missing|not_met", "evidence": "我方标书写5500次" }
] }
```

- **System Prompt**：

```
你是招标合规检查员。逐条判断我方标书是否覆盖招标硬性要求：
covered=已覆盖，missing=缺失，not_met=不满足。给出证据。只输出 JSON。
```

- **落库**：`category=requirement_gap`，`severity` 映射：missing→red、not_met→yellow、covered 不落 issues。

### 5.5 Agent5 竞标对比分析（bid_compare）

- **输入**：Agent2 我方 JSON + 单份对手 JSON（**逐份对手各执行一次**，每份一个 run）
- **输出 Schema**：

```json
{ "gaps": [
  { "field": "cycle_life", "category": "technical_params",
    "our_value": "5500次", "opponent_value": "7000次",
    "severity": "red|yellow|green",
    "gap_description": "描述", "suggestion": "建议" }
] }
```

- **分级规则（rules.js）**：

| 条件 | severity |
|------|:---:|
| 缺认证（如 CE/VDE）、循环寿命低 30%+、报价高 20%+ | red |
| 逆变器效率低 1%、质保少 2 年、系统效率低 2.5% | yellow |
| 描述性/非关键差异 | green |

- **System Prompt**：

```
你是储能竞标分析师。逐字段对比我方与对手，按 red/yellow/green 分级，
给差距描述与修改建议。red=致命(缺认证/寿命低30%+/报价高20%+)，
yellow=重要(效率低1%/质保少2年)，green=次要。只输出 JSON。
```

- **落库**：`category=bid_gap`，`source_agent=bid_compare`。

### 5.6 Agent6 对手标书智能匹配（competitor_match）

- **触发**：① 新建项目未上传对手标书（自动）；② 手动「智能匹配对手标书」；③ 入库过程复用其元数据/索引能力。
- **输入**：当前项目特征（industry_domain / project_scale / technical_params / project_type，其中 project_scale 来自 projects.capacity_mwh 等字段、technical_params 来自 Agent2 我方输出）+ 已有 `competitor_bid_entries`（index_status=indexed）
- **特征降级**：特征优先级 `project_type > industry_domain > project_scale > technical_params`，缺失的特征不参与计分（对应权重为 0），匹配仍可执行。
- **输出 Schema**：

```json
{ "recommendations": [
  { "source_entry_id": "", "source_file_id": "", "company_name": "",
    "match_score": 0.92,
    "match_features": { "industry_domain": "", "project_scale": "",
      "technical_params": [], "project_type": "" },
    "recommendation_reason": "" }
] }
```

- **相似度计算（伪代码）**：

```js
function matchScore(current, entry) {
  let s = 0, w = 0;
  if (current.project_type === entry.project_type) { s += 0.3; w += 0.3; }
  if (current.industry_domain === entry.industry_domain) { s += 0.2; w += 0.2; }
  const scaleSim = scaleSimilarity(current.project_scale, entry.project_scale); // 0~1
  s += scaleSim * 0.25; w += 0.25;
  const techSim = techParamsSimilarity(current.technical_params, entry.tech_params_json); // 0~1
  s += techSim * 0.25; w += 0.25;
  return w > 0 ? s / w : 0;
}
```

- **System Prompt**：对 Top 候选生成 `recommendation_reason`（用项目特征与条目元数据）。
- **落库**：`bid_recommendations`（status=recommended）；Top-N 默认 5；匹配无结果（库空/全低于阈值 0.5）返回空列表。

---

## 6. 自动归档流程（A8，上传对手标书时）

```js
async function archiveCompetitorBid(projectId, file) {
  // 1. 建库检查
  let lib = getLibraryByProject(projectId);
  if (!lib) lib = createLibrary({ project_id: projectId, library_name: `${project.name}对手标书库` });
  // 2. 分类存储（已在文件上传层完成：files + 本地磁盘）
  // 3. 元数据记录
  const meta = await extractMeta(file); // 复用 Agent2 或轻量 LLM 抽取
  const entry = createEntry({ library_id: lib.id, project_id: projectId, file_id: file.id,
    company_name: meta.company_name, industry_domain: meta.industry_domain,
    project_scale: meta.project_scale, project_type: meta.project_type,
    tech_params_json: meta.tech_params, index_status: 'indexing' });
  // 4. 索引建立
  try {
    const vec = buildFeatureVector(meta);
    updateEntry(entry.id, { feature_vector: JSON.stringify(vec), index_status: 'indexed' });
  } catch (e) {
    updateEntry(entry.id, { index_status: 'failed' });
  }
  // 5. 更新计数
  updateLibrary(lib.id, { entry_count: lib.entry_count + 1 });
}
```

---

## 7. 异常处理

| 场景 | 处理 |
|------|------|
| LLM 返回非法 JSON | 重试 1 次 → 抛错 → agent failed |
| LLM 超时/无 Key | 降级 MockProvider 读预生成 JSON |
| PDF 无文本 | 抛错 → agent failed（提示扫描件） |
| 归档失败（磁盘/元数据） | 记录错误，库记录回滚，前端提示重传 |
| 索引失败 | entry.index_status=failed，不影响归档；匹配时跳过 |
| 匹配无结果 | 返回空列表，前端提示上传对手标书 |
| 单 Agent 失败 | 其余继续；「提交审批」因未 AI 跑通被禁用 |
| 依赖缺失 | 下游不执行，标记 pending/跳过 |
| 服务重启中断 | 启动时将 `running` 的 agent_runs 置为 `failed`（error_message='服务重启中断，请重试'） |

---

## 8. 状态汇报

- Orchestrator 每步更新 `agent_runs.status`（pending→running→success/failed）与耗时。
- 前端轮询 `GET /api/projects/:id/agent/runs`（1~2s）展示进度条。
