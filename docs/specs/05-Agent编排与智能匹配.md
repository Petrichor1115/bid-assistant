# Spec 05 · Agent 编排与智能匹配

> 依赖：Spec 02、04　|　对应里程碑：M4/M5　|　参考：[05-Agent编排与Prompt设计.md](../prd/05-Agent编排与Prompt设计.md)、[modules/03](../prd/modules/03-对手标书库与智能匹配.md)

## 1. 目标
实现 Orchestrator + 6 个 Agent + LLM Provider（deepseek/mock 降级）+ PDF 提取 + 对手标书入库 + 智能匹配推荐。

## 2. 范围
- **含**：6 Agent、orchestrator、llmProvider、pdfExtractor、prompts、rules、schemas、入库服务（A8）、匹配服务（A9）。
- **不含**：results 聚合接口（Spec 06）、前端。

## 3. 交付物
```
server/src/services/agent/
├── orchestrator.js        # runAll(5主流程)/单跑/重试/落库
├── llmProvider.js         # Deepseek + Mock 降级
├── pdfExtractor.js        # pdf-parse
├── prompts.js             # 6 个 System Prompt
├── schemas.js             # 输出 JSON 校验
├── rules.js               # 规则/阈值
└── agents/agent1~agent6.js
server/src/services/archive/archiveService.js   # A8 入库
server/src/services/library/matchService.js     # A9 匹配
server/src/mock/*.json                          # 预生成输出
```

## 4. 编排核心（orchestrator.js）

```js
const MAIN = ['parse_announcement','parse_document','quality_check','requirement_coverage','bid_compare'];
async function runAll(projectId, versionNo){
  const ctx = {};
  for(const name of MAIN) ctx[name] = await runWithRetry(name, projectId, versionNo, ctx);
  return ctx;
}
async function runWithRetry(name, projectId, versionNo, ctx){
  const run = createRun(name, projectId, versionNo);          // pending
  for(let i=1;i<=3;i++){
    try{
      updateRun(run.id,{status:'running',started_at:now()});
      const input = buildInput(name, versionNo, ctx);
      updateRun(run.id,{input_json:JSON.stringify(input)});
      const out = await agents[name](input);
      validate(name,out);
      updateRun(run.id,{status:'success',output_json:JSON.stringify(out),finished_at:now(),duration_ms:...});
      persistIssues(name, projectId, versionNo, out);         // 幂等：先删同 version+source_agent 再写
      return out;
    }catch(e){ if(i===3){ updateRun(run.id,{status:'failed',error_message:e.message,finished_at:now()}); throw e; } }
  }
}
```

## 5. 六个 Agent（输入 → 输出 → 落库）

| Agent | 输入 | 输出 | 落库 |
|-------|------|------|------|
| Agent1 parse_announcement | 公告 PDF 文本 | `{requirements:[{category,item,is_mandatory,source_page:null}]}` | 供 Agent4 |
| Agent2 parse_document | 我方/对手 PDF 文本（对手逐份） | 统一 schema 结构化字段 | output_json |
| Agent3 quality_check | Agent2 我方 | `{issues:[{type,field,current_value,severity,suggestion}]}` | issues(self_check) |
| Agent4 requirement_coverage | Agent1+Agent2我方 | `{coverage:[{req_item,category,our_status,evidence}]}` | issues(requirement_gap) |
| Agent5 bid_compare | Agent2 我方+单份对手 | `{gaps:[{field,our_value,opponent_value,severity,gap_description,suggestion}]}` | issues(bid_gap) |
| Agent6 competitor_match | 项目特征 + entries | `{recommendations:[{...match_score,match_features,recommendation_reason}]}` | bid_recommendations |

**分级规则（rules.js）**：缺认证/寿命低30%+/报价高20%+→red；效率低1%/质保少2年→yellow；其余→green。
**匹配**：特征优先级 `project_type > industry_domain > project_scale > technical_params`，缺失降级；Top5；阈值 0.5。

## 6. LLM Provider 与 Mock
- `getProvider()`：有 Key 且 `LLM_MOCK!=true` → Deepseek；否则 Mock 读 `mock/{agent}.json`。
- JSON 解析失败重试 1 次，再失败抛错（failed）。
- 服务启动时：`UPDATE agent_runs SET status='failed',error_message='服务重启中断，请重试' WHERE status='running'`。

## 7. 入库与匹配（A8/A9）
```js
// A8 入库：建库检查→(files已存)→元数据抽取→写 entry(indexing)→feature_vector 建立→indexed→entry_count+1
// A9 匹配：特征提取→库内相似度计算→LLM 排序+理由→写 bid_recommendations(recommended)
// adopt：status=adopted，该对标书进入 Agent2/Agent5 对比输入
```

## 8. 接口（路由在 Spec 06 挂载）
`POST /api/projects/:id/agent/run`、`POST /api/projects/:id/agent/:name/run`、`GET /api/projects/:id/agent/runs`、`GET /api/agent/runs/:runId`、`POST /api/agent/runs/:runId/retry`、`GET/POST /api/projects/:id/competitor-library[/match]`、`GET /api/projects/:id/competitor-recommendations`、`PUT /api/recommendations/:id/adopt|dismiss`。

## 9. 验收标准
- 一键跑：5 主流程依次 success，输入/输出存档，issues 落库无重复。
- 无 Key：Mock 全流程可跑通；单 Agent 失败可重试。
- 上传对手标书自动入库（entry indexed）；无对手标书触发匹配返回 Top5 推荐；采用后参与对比。
