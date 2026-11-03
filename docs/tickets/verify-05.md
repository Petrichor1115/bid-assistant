# 验证记录 · Spec 05 Agent 编排与智能匹配（T12 联调验证）

> 来源票据：`docs/tickets/05-Agent编排与智能匹配.md` T12
> 依赖：Spec 02/04；LLM 无 Key，走 Mock 降级（`LLM_MOCK=true`）

## 结论：✅ 全部通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | 一键跑 5 主流程依次 success，输入/输出存档，issues 无重复 | ✅ |
| 2 | 无 Key：Mock 全流程可跑通；单 Agent 失败可重试 | ✅ |
| 3 | 上传对手标书自动入库（indexed）；无对手标书匹配返回 Top5；采用后参与对比 | ✅ |

## 实测结果

- **一键跑 Agent**：`POST /projects/:id/agent/run` → 产生 6 条 run（`parse_announcement`×1、`parse_document`×2[我方+对手]、`quality_check`×1、`requirement_coverage`×1、`bid_compare`×1），全部 `success`。
- **issues 落库**：11 条，分类分布：
  - `self_check`：red 1 + yellow 2
  - `requirement_gap`：red 1 + yellow 2（covered 不落库）
  - `bid_gap`：red 3 + yellow 2
- **幂等**：重跑 `agent/run` 后 issues 数 11 → 11，无重复（persistIssues 先删同 version+source_agent 再写）。
- **对手标书库**：上传 `competitor_bid` 自动入库，`entry_count=1`、`index_status=indexed`、公司名 `Tesla Energy`、`project_type=commercial`、`project_scale=50.00MWh`。
- **智能匹配**：`POST /competitor-library/match` → 1 条推荐，`Tesla Energy / score=0.6875`（≥0.5 阈值），理由模板生成。
- **重试**：`POST /agent/runs/:runId/retry` → `success`。
- **重启兜底**：`recoverInterruptedRuns()` 在服务启动时将 `running` 置 `failed`。

## 交付文件

- `services/agent/{pdfExtractor,llmProvider,prompts,schemas,rules,orchestrator}.js`
- `services/agent/agents/agent1~agent6.js`
- `services/archive/archiveService.js`（A8 入库真实实现）
- `services/library/matchService.js`（A9 匹配）
- `controllers/{agentController,libraryController}.js` + `routes/{agent,library}.js`
- `mock/{agent1,agent2_our,agent2_opponent,agent3,agent4,agent5,agent6}.json` + `mock/pdfs/*.pdf`
- `scripts/generate-mock-pdfs.js`（手写最小 PDF 生成器）

## 实现偏差说明（重要）

1. **PDF 解析库**：PRD 指定 `pdf-parse`，但其内嵌 pdf.js v1.10.100 存在「同进程首次调用有文本、后续调用返回空」的 bug，导致编排中第二份 PDF 起提取失败。已改用 **`pdfjs-dist@2.16.105`（legacy）** 实现 `pdfExtractor`，重复解析正常。
2. **版本语义修正**：版本由 `our_bid` 驱动（无则 1，有则 MAX+1）；`announcement` 跟随当前 our_bid 版本，避免「公告 v1、我方 v2」错配。
3. **入库元数据（MVP 降级）**：A8 的 `extractMeta` 用「文件名启发式 + 继承项目 storage_type/capacity」替代真实 LLM 抽取（`Tesla` 文件名 → `Tesla Energy`；项目 commercial/50MWh → entry 同类型同规模），保证匹配可跑通；`index_status` 建立失败不影响入库。
4. **mock PDF**：因 pdfkit 生成的中文会乱码、且部分 PDF 触发 pdf-parse 兼容问题，改为手写最小 PDF（PDF 1.4，无压缩，英文文本），内容为 JSON 数据的自然语言描述。

## 备注

- 联调产生若干测试项目/文件（`Spec05 联调项目*`、`匹配联调项目`、`最终验证项目`），属演示数据，后续 Spec 06 会新建项目验证，不影响。
