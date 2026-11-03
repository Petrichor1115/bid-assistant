# 验证记录 · Spec 06 结果、审批、归档与报告（T09 联调验证）

> 来源票据：`docs/tickets/06-结果审批归档与报告.md` T09
> 依赖：Spec 05（agent_runs / issues 数据）

## 结论：✅ 全部通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | results 4 类数据正确、多对手过滤、未跑过 version_no=null | ✅ |
| 2 | 未 AI 跑通提交审批 → 422；跑通 → approved | ✅ |
| 3 | 非 approved 归档 → 409；归档生成报告、PDF 可下载、status=archived | ✅ |

## 实测结果

| 场景 | 状态 | 说明 |
|------|:---:|------|
| 未跑 AI 提交审批 | 422 | 未完成 AI 分析，无法提交审批 |
| 未跑过 results | 200 | `version_no=null` + 空结果 |
| 跑通后 results | 200 | version_no=1，opponents=1，self_check=3，coverage=9，bid_gaps=5，param_opponents=1 |
| issues 筛选 `severity=red` | 200 | total=5 |
| 标记解决 `PUT /issues/:id` | 200 | is_resolved=1 |
| 提交审批 | 200 | project_status=approved，3 条 approvals（tech_lead/legal/bid_director，auto_approved=1） |
| 审批列表 | 200 | 3 条 |
| 归档 | 200 | final_summary 模板正确，status→archived |
| 报告 | 200 | total_versions=1 |
| PDF 下载 | 200 | application/pdf，1556 字节，`%PDF` 头正确 |
| 非 approved 归档 | 409 | 非 approved 状态不可归档 |

## 交付文件

- `controllers/resultController.js`（results / listIssues / updateIssue）
- `controllers/approvalController.js`（submitApproval / listApprovals）
- `controllers/reportController.js`（archive / getReport / getPdf）
- `services/report/reportGenerator.js`（统计 + final_summary 模板 + pdfkit PDF）
- `routes/results.js`、`routes/approvals.js`、`routes/reports.js`

## 备注

- `final_summary` 模板：`项目共迭代 N 版，累计耗时 X 小时；自审 a 项、招标差距 b 项、竞标差距 c 项，其中致命 d 项。`
- PDF 用英文标签（`Project Report` + 数字统计）规避 pdfkit 中文字体缺失导致的乱码。
- results 的 `param_compare.our/opponents` 从 Agent2 `parse_document` output_json 提取（按 `input_json.file_id` 精确关联对手文件），`opponent_file_id` 参数可过滤多对手。
- 审批提交前置校验：5 主流程 Agent（`parse_announcement/parse_document/quality_check/requirement_coverage/bid_compare`）全 success（Agent6 不纳入）。
