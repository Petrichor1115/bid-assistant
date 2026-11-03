# context · 名词歧义 Context（术语上下文澄清）

> 用途：统一总 PRD 与各子 PRD 中的名词口径，消除一词多义、一词两指。所有文档引用术语时以本文件为准。
> 维护规则：新增/变更术语须同步本文；字段命名歧义以「统一含义」列为准。

## 1. 高优先级歧义（P0，必须统一）

| # | 名词 | 歧义点 | 统一含义 | 使用边界 |
|---|------|--------|---------|---------|
| C1 | **归档** | ① 对手标书"自动归档"（A8，上传后存入对手标书库）；② "项目归档"（流程⑦，status→archived + 生成报告）。两处语义完全不同 | ① 称「**入库/收录**」（对手标书归档）；② 称「**项目归档/封存**」（项目归档） | 文档中"归档"后紧跟对象：说文件→入库；说项目→项目归档 |
| C2 | **bidder** | `projects.bidder` 注释为「招标方」；`users.role='bidder'` 指「投标专员」。同一英文在两处语义相反 | 字段 `projects.bidder` = **招标方（发标方）**；角色 `bidder` = **投标专员（我方）** | 字段文案统一显示"招标方"；英文字段名 MVP 保留，注释澄清，后续可改名 `tenderer` |
| C3 | **版本 / version_no** | 文件版本？项目版本？我方标书版本？ | **以我方标书驱动**的项目版本：创建=1，上传新版本=+1；announcement/our_bid 跟随，competitor_bid 仅作归档时点标记 | agent_runs/issues/approvals 的 version_no 均指"本次分析针对的我方标书版本" |

## 2. 资产与文件类

| 名词 | 英文/标识 | 统一含义 | 使用边界 |
|------|----------|---------|---------|
| 三件套 | - | 3 **类**文件：招标公告 + 我方标书 + 对手标书（对手可多份） | 非 3 个文件，是 3 类文件 |
| 招标公告 | announcement | 招标方发布的招标文件 | file_type=announcement |
| 我方标书 | our_bid | 沃泰能源投标响应文件 | file_type=our_bid |
| 对手标书 | competitor_bid | 本项目已上传的对手投标文件 | file_type=competitor_bid |
| 对手标书库 | competitor_bid_libraries | **项目专属**的对手标书归档库（存储+元数据+索引） | 每项目 1:1 |
| 历史标书库 | D2 | **全局**跨项目的对手标书归档（管理端浏览） | MVP 仅自动收录，管理端界面为 PPT 规划 |
| 对标书 | - | AI 智能匹配推荐、用于对比的**同类项目**对手标书 | 与"本项目对手标书"区分 |

## 3. Agent 与编排类

| 名词 | 标识 | 统一含义 | 使用边界 |
|------|------|---------|---------|
| 6 Agent | - | **总数**：Orchestrator + 5 主流程 + Agent6 | 描述体系时用 |
| 主流程 Agent | parse_announcement/parse_document/quality_check/requirement_coverage/bid_compare | 一键跑全流程执行的 **5 个** | 一键跑=5 个 |
| Agent6 | competitor_match | 对手标书智能匹配，**按需触发** | 不在一键跑内 |
| 一键跑全流程 | - | 顺序执行 5 主流程 Agent | 不含 Agent6 |
| AI 跑通 | - | 最新版本 5 主流程 Agent 全 `success`（**Agent6 不纳入**） | 提交审批的前置门槛 |
| 自审 / 质量自审 | quality_check | Agent3 产出，是**建议**非硬门槛 | 不阻断对比/审批 |
| 智能匹配 | competitor_match | 基于 类型/行业/规模/技术参数 检索推荐 | 特征缺失可降级 |

## 4. 结果与问题类

| 名词 | 标识 | 统一含义 | 使用边界 |
|------|------|---------|---------|
| issue / 问题清单 | issues 表 | **总表泛称**，含三类 | - |
| 自审问题 | self_check | Agent3 产出（missing/duplicate/abnormal） | category=self_check |
| 覆盖差距 | requirement_gap | 招标要求 vs 我方（covered/missing/not_met） | category=requirement_gap |
| 竞标差距 | bid_gap | 我方 vs 对手（red/yellow/green） | category=bid_gap |
| 覆盖度 / 覆盖状态 | our_status | ✅covered / ❌missing / ⚠️not_met | Agent4 输出 |
| 严重度 / 三级分级 | severity | 🔴red / 🟡yellow / 🟢green | 所有差距项必须标注 |
| 版本 Diff | diff | **我方标书版本间**逐字段差异（A5） | 与"竞标对比"区分 |

## 5. 流程与状态类

| 名词 | 统一含义 | 使用边界 |
|------|---------|---------|
| 项目归档/封存 | status→archived + 生成总报告 | 与"入库"区分（见 C1） |
| 三级审批 | tech_lead → legal → bid_director | MVP 硬编码自动通过 |
| 自动审批 | auto_approved=1，自动通过 | 无独立审批页面 |
| 自动装配 | db:provision 自动准备数据库 | 云→Docker→本地→自动安装 |

## 6. 存储与技术类

| 名词 | 统一含义 | 使用边界 |
|------|---------|---------|
| 云端对象存储 | S3/OSS/MinIO 云端，存 mysqldump | CLOUD_STORAGE_DRIVER |
| 云数据库 | 云 MySQL（RDS）直连 | CLOUD_DB_URL |
| 云端（三级策略目标态） | ①云数据库 或 ②Docker MySQL + dump 上云 | 优先级最高 |
| 本地 MySQL（兜底） | 127.0.0.1:3306 的 MySQL 8.0 | 云端不可用时 |
| mock / MockLLM | LLM Provider 降级实现，读预生成 JSON | 无 Key/失败时 |
| 索引 / 特征向量 | feature_vector + index_status(indexing/indexed/failed) | 相似度检索用 |

## 7. 字段命名歧义清单（研发注意）

| 字段 | 现语义 | 建议 | 状态 |
|------|--------|------|------|
| projects.bidder | 招标方（发标方） | 改名 `tenderer`，MVP 保留并注释 | 待定 |
| projects.storage_type | 储能场景 | 语义清晰，保留 | - |
| projects.capacity_mwh/power_mw/duration_h | 项目规模三要素 | 供智能匹配特征 | - |
| files.version_no | 随文件类型语义不同 | 见 C3 | - |
| issues.opponent_value | 仅 bid_gap 使用 | 语义清晰 | - |
