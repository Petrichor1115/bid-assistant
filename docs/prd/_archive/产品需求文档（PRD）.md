# 标书智能审核对比系统 — 产品需求文档（PRD）

> **文档版本**：v1.1
> **编写日期**：2026-10-27
> **修订日期**：2026-10-27（新增：对手标书自动归档与智能匹配功能）
> **产品版本**：MVP
> **关联文档**：《产品架构设计.md》v1.0
> **面向对象**：产品、研发、测试、项目干系人
> **课题背景**：沃泰能源 AI 原生实践课题①落地

---

## 目录

1. [产品概述](#1-产品概述)
2. [用户画像](#2-用户画像)
3. [核心痛点](#3-核心痛点)
4. [功能模块](#4-功能模块)
5. [Agent 编排逻辑](#5-agent-编排逻辑)
6. [数据模型](#6-数据模型)
7. [非功能需求与验收标准](#7-非功能需求与验收标准)
8. [附录](#8-附录)

---

## 1. 产品概述

### 1.1 产品定位

**标书智能审核对比系统** 是面向 **沃泰能源海外储能投标专员** 的 **AI 原生标书审核对比工具**，以「多 Agent 协作编排」为核心能力，将海外大储招投标中「拆解标书 → 提取技术参数 → 覆盖度核查 → 对手对比 → 差距分级 → 修改建议」这一整套高强度人工工作，转化为自动化、可迭代、可追溯的 Agent 工作流。

**产品形态**：Web 应用（React + Ant Design 前端 / Node.js Express 后端），用户通过浏览器上传文件、触发 Agent、查看对比结果、迭代版本、提交审批、导出报告。

### 1.2 业务背景

沃泰能源是面向全球的储能与智慧能源企业，产品覆盖户用储能、工商业储能、大型储能系统及 EMS、BMS 等核心部件，业务遍及欧洲等海外市场。海外大储项目主要通过招投标获得订单，一个项目需与 Tesla、BYD、CATL、Sungrow、Huawei 等多家国际对手同台竞争。

### 1.3 建设目标

| 目标编号 | 建设目标 | 衡量指标（可验证） |
|:---:|---------|-------------------|
| G1 | 将人工逐页拆解标书的工作自动化 | 三件套上传后，Agent 自动完成结构化提取 |
| G2 | 自动生成招标要求覆盖度矩阵 | 每条硬性要求产出 ✅/❌/⚠️ 覆盖状态 |
| G3 | 自动生成我方 vs 对手差距清单 | 每条差距产出 🔴/🟡/🟢 三级分级 |
| G4 | 支持多轮版本迭代闭环 | 版本时间线记录 V1→V2→V3… |
| G5 | 审批通过后自动生成项目总报告 | 归档时自动汇总并支持 PDF 导出 |
| G6 | 全流程可追溯 | 每次 Agent 运行输入/输出/耗时完整存档 |
| G7 | 对手标书自动归档与智能匹配 | 上传对手标书自动入库存档；无对手标书时自动匹配并推荐同类项目对标书 |

### 1.4 业务价值

- **提效**：将数百页标书的「拆解—对比—找差距」从数天压缩到分钟级。
- **提质**：用统一 Schema 与规则消除人工遗漏、口径不一致的问题，降低漏项风险。
- **降本**：提前暴露致命差距（如缺少强制认证、报价偏高），避免废标与无效投入。
- **决策支撑**：🔴🟡🟢 三级分级 + 修改建议，为报价策略与方案优化提供量化依据。
- **知识沉淀**：历史标书库与项目总报告沉淀为组织级投标资产，反哺后续项目。
- **对标赋能**：对手标书自动归档入库 + AI 智能匹配，即便拿不到本项目对手标书，也能从历史同类项目标书中自动推荐对标对象。

### 1.5 一句话描述

> 上传招标公告 + 我方标书 + 对手标书 → Agent 群自动拆解储能技术参数并对比 → 生成差距清单和修改建议 → 多轮迭代 → 审批归档 → 自动生成项目总报告。

### 1.6 适用边界（MVP 范围界定）

**适用（MVP 内）**：

- 储能招投标场景（户用储能 / 工商业储能 / 大型储能 / EMS+电池包）。
- 文件格式：**电子版 PDF**（非扫描件）；文本可被 pdfplumber / PyMuPDF 提取。
- 用户角色：投标专员全流程操作；Admin 简化管理；技术负责人/法务/投标主管以审批流形式体现，不做独立页面。
- 审批：三级审批流在系统内硬编码为自动通过。
- 对手标书自动归档至项目专属对手标书库（分类存储 + 元数据 + 索引）；无专属库时触发 AI 智能匹配并推荐同类项目对标书。
- 语言/地区：欧洲海外市场为主（如德国、荷兰、西班牙）。

**不适用（MVP 外，见扩展规划）**：

- 扫描件 OCR（生产环境扩展）。
- 技术负责人/法务/投标主管的独立审批页面与交互。
- Admin 用户完整 CRUD（MVP 为硬编码示例用户）。
- Agent 参数/Prompt 可视化配置、跨项目总报告、一键生成修改建议文档（PPT 规划项）。
- 历史标书库管理端浏览/筛选界面（D2，PPT 规划项）；对手标书库的自动归档与智能匹配在 MVP 内实现（见 4.2 模块 A、第 5 章）。

---

## 2. 用户画像

### 2.1 角色总览

| 角色 | 系统标识（role） | 核心职责 | MVP 实现状态 | 主要使用页面 |
|------|:---:|---------|:-----------:|-------------|
| 投标专员 | `bidder` | 创建项目、上传文件（对手标书自动归档/缺失自动匹配推荐）、触发 Agent、修改迭代、提交审批 | ✅ 全实现 | 个人仪表盘 / 项目列表 / 新建项目 / 项目详情 / 对比结果 / 对手标书库 / 版本 Diff / 项目总报告 |
| 技术负责人 | `tech_lead` | 审核技术参数、方案可行性 | 📄 流程体现，页面不做 | 审批流（自动通过） |
| 法务 | `legal` | 审核合同条款、商务风险 | 📄 流程体现，页面不做 | 审批流（自动通过） |
| 投标主管 | `bid_director` | 最终决策终审 | 📄 流程体现，页面不做 | 审批流（自动通过） |
| Admin | `admin` | 用户/角色/系统配置 | 🔧 简化实现（硬编码角色） | 系统仪表盘 / 用户管理 / Admin 管理页 |

> **MVP 审批策略**：投标专员点击「提交审批」后，三级审批流（技术 → 法务 → 主管）在系统中硬编码为自动通过（`auto_approved = true`），不做独立审批页面。真实三级审批流程在 PPT 架构图中完整展示。

### 2.2 各角色详细画像

#### 2.2.1 投标专员（核心用户）

| 维度 | 描述 |
|------|------|
| **核心特征** | 熟悉储能技术与招投标流程；一个项目常需同时面对多家国际对手；日常工作节奏快、交付节点紧；人工拆解对比工作量大且易漏项 |
| **核心诉求** | ① 快速拆解数百页标书并结构化；② 自动核查我方是否满足招标硬性要求；③ 自动对比对手并给出差距与修改建议；④ 对手标书自动归档入库、无对手标书时自动推荐同类对标书；⑤ 多轮版本迭代可追溯；⑥ 一键生成报告向领导汇报 |
| **关键场景** | 新建项目上传三件套（对手标书自动入库/缺失时自动匹配推荐）→ 触发 Agent → 查看结果 → 修改标书 → 上传新版本 → 循环直至满意 → 提交审批 → 归档出报告 |
| **权限范围** | 项目全生命周期操作；Agent 触发；查看对比结果与报告 |

#### 2.2.2 技术负责人

| 维度 | 描述 |
|------|------|
| **核心特征** | 深谙储能电池/逆变器/EMS/BMS 技术细节；关注技术参数合理性与方案可行性 |
| **核心诉求** | ① 确认技术参数真实可交付；② 判断差距项的方案可优化空间；③ 对致命技术差距作出裁决 |
| **关键场景** | 审批流第一级：审核技术参数与方案可行性（MVP 自动通过） |
| **权限范围** | 审批流中的技术审核节点（MVP 无独立页面） |

#### 2.2.3 法务

| 维度 | 描述 |
|------|------|
| **核心特征** | 关注合同条款、资质认证合规、商务与法律风险 |
| **核心诉求** | ① 确认资质认证（CE/IEC/VDE 等）满足招标与当地法规；② 识别商务条款与合同风险 |
| **关键场景** | 审批流第二级：审核合同条款与商务风险（MVP 自动通过） |
| **权限范围** | 审批流中的法务审核节点（MVP 无独立页面） |

#### 2.2.4 投标主管

| 维度 | 描述 |
|------|------|
| **核心特征** | 负责最终投标决策；关注整体竞争力、报价策略与中标率 |
| **核心诉求** | ① 全局掌握差距清单与严重度；② 基于报告作出是否投标/如何定价的最终决策 |
| **关键场景** | 审批流第三级：最终终审（MVP 自动通过） |
| **权限范围** | 审批流中的终审节点（MVP 无独立页面） |

#### 2.2.5 Admin（系统管理员）

| 维度 | 描述 |
|------|------|
| **核心特征** | 负责系统运维与账号/角色配置；非投标业务一线 |
| **核心诉求** | ① 查看系统运行状态（项目数、Agent 运行次数、成功率、存储用量）；② 管理用户与角色权限；③ 配置系统与 Agent 参数（扩展） |
| **关键场景** | 登录 Admin → 系统仪表盘 → 用户管理 →（扩展）Agent 配置/系统设置 |
| **权限范围** | 用户管理、系统配置、全部项目可见 |

---

## 3. 核心痛点

### 3.1 业务现状描述

海外大储招投标中，标书动辄数百页。投标团队目前依赖人工完成：逐页拆解对手标书与招标参数、手工整理对比表、逐项找差距，再据此调整报价与方案。

### 3.2 痛点清单

| 编号 | 痛点 | 现状描述 | 影响 | 待解决诉求 |
|:---:|------|---------|------|-----------|
| P1 | **人工拆解效率极低** | 数百页标书逐页翻阅、逐项摘录，一个项目耗时数天 | 交付周期长，错过最佳迭代窗口 | 自动提取标书内容并结构化 |
| P2 | **技术参数对比易漏项** | 电池类型、循环寿命、逆变器效率、安全认证等大量参数人工比对，容易遗漏 | 漏项直接导致废标或报价偏差 | 基于统一 Schema 自动逐字段对比 |
| P3 | **准确率难以保证** | 参数口径不一致、单位/条件（如循环寿命的 DoD 条件）理解偏差 | 对比结果不可信，误导报价策略 | 统一口径 + 规则校验 + LLM 语义判断 |
| P4 | **对手差距缺乏量化分级** | 只知"有差距"，不知"差距多致命"，无法排优先级 | 修改方向不聚焦，资源错配 | 🔴🟡🟢 三级分级 + 修改建议 |
| P5 | **招标硬性要求覆盖度不明** | 无法快速确认我方是否逐条满足强制条款 | 可能因漏满足硬性条款而废标 | 生成覆盖度矩阵（✅/❌/⚠️） |
| P6 | **多轮修改过程无法追溯** | 版本分散、改动点不清，无法复盘 | 汇报困难，责任不清 | 版本时间线 + 版本 Diff |
| P7 | **知识无法沉淀复用** | 每次投标从零开始，历史标书与结论未积累 | 组织能力不成长，重复劳动 | 项目总报告 + 历史标书库 |
| P8 | **决策汇报缺量化依据** | 无法快速产出面向主管的差距与耗时统计报告 | 决策慢、沟通成本高 | 自动生成总报告 + 图表 + PDF 导出 |
| P9 | **对手标书缺失或难获取** | 部分项目拿不到对手标书，或对手标书分散、未沉淀，无法对标 | 无法做对比分析，报价与方案决策"拍脑袋" | 对手标书自动归档入库 + AI 智能匹配推荐同类对标书 |

### 3.3 痛点 → 解决方案映射

| 痛点 | 解决方案（对应功能/Agent） |
|------|---------------------------|
| P1 人工拆解效率低 | Agent1 招标公告解析 + Agent2 文档解析 |
| P2 参数对比漏项 | Agent2 统一 Schema + Agent5 对手对比分析 |
| P3 准确率难保证 | Agent3 质量自审（规则+LLM）+ 统一 Schema |
| P4 差距无分级 | Agent5 对手对比 + 🔴🟡🟢 三级分级 |
| P5 覆盖度不明 | Agent1 硬性要求 + Agent4 招标要求覆盖度 |
| P6 版本无法追溯 | A3 版本时间线 + A5 版本 Diff |
| P7 知识无法沉淀 | A6 项目总报告 + D2 历史标书库（扩展） |
| P8 决策无量化依据 | E2 项目总报告（图表 + PDF 导出） |
| P9 对手标书缺失/未沉淀 | A8 对手标书自动归档 + A9 智能匹配推荐 + Agent6 对手标书智能匹配 |

---

## 4. 功能模块

### 4.1 模块总览

系统共 5 个一级功能模块（A~E），MVP 实现状态分三类：✅ 全实现 / 📄 PPT 设计（流程/架构体现，不做页面）/ 🔧 简化实现。

| 一级模块 | 名称 | MVP 状态 | 目标角色 |
|:---:|------|:---:|------|
| A | 项目管理 | ✅ 全实现 | 投标专员（核心）/ 全员 |
| B | Agent 编排中心 | ✅ 全实现 | 投标专员 / Admin |
| C | 用户与权限 | 🔧 简化实现 | Admin / 全员 |
| D | 管理后台 | 🔧/📄 简化+PPT | Admin |
| E | 统计报告 | ✅ 全实现（个人+项目级） | 投标专员 / 全员 |

### 4.2 模块 A：项目管理

#### A1 项目列表

| 项 | 说明 |
|----|------|
| **核心能力** | 展示全部项目；支持状态筛选、搜索、表格视图 |
| **交互逻辑** | 状态筛选 Tab：草稿 / 进行中 / 待审批 / 已归档；搜索框按项目名/招标方关键字过滤；点击行进入项目详情；[新建项目] 按钮入口 |
| **MVP** | ✅ |
| **角色** | 全部 |

#### A2 新建项目

| 项 | 说明 |
|----|------|
| **核心能力** | 创建项目并上传「三件套」文件 |
| **交互逻辑** | 填写项目名称、招标方、投标截止日期、招标地区；选择储能场景分类（户用/工商业/大型/EMS+电池包）；拖拽上传 3 类文件（招标公告 / 我方标书 / 对手标书，对手标书支持多份，上传后自动归档至本项目对手标书库；未上传对手标书时自动触发智能匹配并推荐同类项目对标书）；校验必填项后创建，初始状态 `draft` |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### A3 项目详情

| 项 | 说明 |
|----|------|
| **核心能力** | 项目信息聚合 + Agent 触发入口 |
| **交互逻辑** | 展示基本信息卡、文件列表（含版本号）、版本时间线；提供 [一键跑 Agent] 按钮与 Agent 执行状态条；单个 Agent 触发（调试用） |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### A4 对比结果页（核心页面）

| 项 | 说明 |
|----|------|
| **核心能力** | 展示 4 类分析结果 |
| **交互逻辑** | 4 Tab 切换：① 自审问题 ② 招标要求覆盖度 ③ 对手差距 ④ 参数对比表；所有差距项以 🔴🟡🟢 分级标记，并展示修改建议 |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### A5 版本 Diff

| 项 | 说明 |
|----|------|
| **核心能力** | 版本间修改点对比 |
| **交互逻辑** | 选择 V(N)→V(N+1)，对修改点进行 diff 高亮展示，附修改摘要 |
| **MVP** | ✅（P1） |
| **角色** | 投标专员 |

#### A6 项目总报告

| 项 | 说明 |
|----|------|
| **核心能力** | 归档时自动生成项目级总结报告 |
| **交互逻辑** | 展示版本迭代时间线、每版本 AI 自审问题数 + 差距问题数、版本修改次数/总耗时、问题分类统计（自审 vs 招标差距 vs 对手差距）、[导出 PDF] |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### A7 归档项目查看

| 项 | 说明 |
|----|------|
| **核心能力** | 只读查看已归档项目 |
| **交互逻辑** | 只读查看所有已归档项目及其历史版本、报告入口 |
| **MVP** | ✅ |
| **角色** | 全部 |

#### A8 对手标书自动归档

| 项 | 说明 |
|----|------|
| **核心能力** | 对手标书上传后自动归档至本项目专属对手标书库 |
| **交互逻辑** | 上传对手标书 → 系统自动完成：① 若本项目未创建专属对手标书库则自动建库；② 文件分类存储（MinIO）并写入 files 与库条目；③ 元数据记录（公司名/行业领域/项目规模/项目类型/技术参数摘要）；④ 特征索引建立（feature_vector）；⑤ 库内条目数 entry_count 更新。归档状态在项目详情/对手标书库页可见 |
| **MVP** | ✅ |
| **角色** | 投标专员（上传后自动触发） |

#### A9 智能匹配与对标书推荐

| 项 | 说明 |
|----|------|
| **核心能力** | 项目无专属对手标书库时，AI 智能匹配同类项目对标书并推荐 |
| **交互逻辑** | 触发条件：① 新建项目未上传对手标书时自动触发；② 项目详情手动点击「智能匹配对手标书」。系统基于项目行业领域/项目规模/技术参数/项目类型等核心特征，在已有对手标书库中检索相似度最高的同类项目标书，输出推荐列表（含匹配得分与推荐理由）；推荐结果自动推送至对比分析模块，用户可「采用」直接将推荐对标书调取用于标书对比分析 |
| **MVP** | ✅ |
| **角色** | 投标专员 |

### 4.3 模块 B：Agent 编排中心

#### B1 Agent 触发

| 项 | 说明 |
|----|------|
| **核心能力** | 启动 Agent 工作流 |
| **交互逻辑** | [一键跑全流程] 按钮（跑通 6 个 Agent）；支持单独触发某个 Agent（调试用）；[智能匹配对手标书] 触发 Agent6；触发后进入执行状态监控 |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### B2 Agent 执行状态

| 项 | 说明 |
|----|------|
| **核心能力** | 实时进度展示 |
| **交互逻辑** | 实时展示状态流转：排队中 → 解析中 → 抽取中 → 对比中 → 完成；展示每个 Agent 的耗时 |
| **MVP** | ✅ |
| **角色** | 投标专员 |

#### B3 Agent 运行历史

| 项 | 说明 |
|----|------|
| **核心能力** | 运行日志与重试 |
| **交互逻辑** | 每个项目每次运行完整日志；成功/失败状态标记；失败项提供 [重试] 按钮 |
| **MVP** | ✅ |
| **角色** | 投标专员 / Admin |

#### B4 Agent 参数配置

| 项 | 说明 |
|----|------|
| **核心能力** | 可视化配置 Agent 推理参数 |
| **交互逻辑** | System Prompt 编辑、模型选择、温度/Max Token 设置（PPT 设计） |
| **MVP** | 📄 PPT 设计 |
| **角色** | Admin |

#### B5 差距严重度阈值配置

| 项 | 说明 |
|----|------|
| **核心能力** | 配置差距分级判定阈值 |
| **交互逻辑** | 🔴🟡🟢 各等级判定阈值可配置（PPT 设计） |
| **MVP** | 📄 PPT 设计 |
| **角色** | Admin |

### 4.4 模块 C：用户与权限（Admin）

| 子模块 | 核心能力 | 交互逻辑 | MVP |
|--------|---------|---------|:---:|
| C1 登录 | 身份认证 | 用户名 + 密码 + 角色选择（简化） | ✅ |
| C2 用户管理 | 查看示例用户 | 硬编码 4 个示例用户（各角色 1 人） | ✅ |
| C3 角色权限 | 角色化菜单 | 5 个预置角色，不同角色看到不同侧边栏菜单 | ✅ |
| C4 用户 CRUD | 用户维护 | 新建/编辑/禁用用户 + 角色分配 | 🔧 简化版 |

### 4.5 模块 D：管理后台（Admin）

| 子模块 | 核心能力 | 交互逻辑 | MVP |
|--------|---------|---------|:---:|
| D1 系统仪表盘 | 运行概览 | 项目总数 / Agent 运行次数 / 成功率 / 存储用量 | ✅ 简化 |
| D2 历史标书库 | 标书资产沉淀 | 已归档项目对手标书自动收录（收录由 A8 自动完成）+ 管理端筛选 + 标记推荐对标对象 | 🔧 收录已实现（MVP），管理端浏览界面 📄 PPT 设计 |
| D3 审批配置 | 审批流配置 | 审批流层级（1/2/3 级）+ 每级审批人设置 | 📄 PPT 设计 |
| D4 系统设置 | 系统配置 | MinIO 连接配置 / LLM API Key 配置 / 数据备份 | 📄 PPT 设计 |

### 4.6 模块 E：统计报告

| 子模块 | 核心能力 | 交互逻辑 | MVP |
|--------|---------|---------|:---:|
| E1 个人仪表盘 | 个人工作台 | 我的项目状态卡片 + 待办事项 + 最近活动时间线 | ✅ |
| E2 项目总报告 | 单项目总结 | 版本迭代汇总 + 问题分类饼图 + 耗时统计 + 导出 PDF | ✅ |
| E3 跨项目总报告 | 组织级洞察 | 中标率趋势 / 平均修改次数 / 高频问题分类 TOP N / 高频差距类型 | 📄 PPT 设计 |

### 4.7 前端页面清单（MVP 版）

| # | 页面 | 角色 | 核心元素 | 优先级 |
|---|------|------|---------|:------:|
| 1 | 登录页 | 全部 | 用户名 + 密码 + 角色下拉 | P0 |
| 2 | 个人仪表盘 | 全部 | 状态卡片（草稿/进行中/待审批/已归档）/ 快速入口 / 最近活动时间线 | P0 |
| 3 | 项目列表 | 全部 | 表格 + 状态筛选 Tab + 搜索框 + [新建项目] 按钮 | P0 |
| 4 | 新建项目 | 投标专员 | 项目信息表单 + 3 个文件拖拽上传区（招标公告/我方标书/对手标书）+ 对手标书上传后自动归档提示 + 无对手标书时智能匹配推荐提示 | P0 |
| 5 | 项目详情 | 投标专员 | 基本信息卡 + 文件列表 + 版本时间线 + [一键跑 Agent] 按钮 + [智能匹配对手标书] 按钮 + 对手标书库入口 + Agent 执行状态条 | P0 |
| 6 | 对比结果 | 投标专员 | **核心页面**：4 Tab 切换 + 🔴🟡🟢 差距分级标记 + 修改建议 + 推荐对标书列表（可直接调取用于对比） | P0 |
| 7 | 对手标书库 | 投标专员 | 本项目专属对手标书库条目列表（公司名/元数据/索引状态）+ 智能匹配推荐列表（匹配得分/推荐理由）+ [采用对标书] 按钮 | P0 |
| 8 | 版本 Diff | 投标专员 | V1→V2 修改点 diff 高亮 + 修改摘要 | P1 |
| 9 | 项目总报告 | 投标专员 | 版本迭代时间线 + 问题分类饼图 + 耗时统计 + [导出 PDF] 按钮 | P0 |
| 10 | 已归档列表 | 全部 | 只读归档项目 + 查看报告入口 | P0 |
| 11 | Admin 管理页 | Admin | 用户列表（硬编码 4 个）+ 系统统计卡片 | P1 |

### 4.8 角色侧边栏菜单

```
投标专员侧边栏：                   Admin 侧边栏：
├── 📊 个人仪表盘                  ├── 📊 系统仪表盘
├── 📁 项目管理                    ├── 👥 用户管理
│   ├── 项目列表                   ├── 📁 项目管理（全部可见）
│   ├── 新建项目                   ├── 🤖 Agent 配置
│   └── 已归档                     ├── 📚 历史标书库
├── 🤖 Agent 运行记录              ├── 📚 对手标书库（全局）
├── 📚 对手标书库（本项目）         ├── ⚙️ 系统设置
└── 📚 历史标书库（只读）           └── 📈 跨项目统计
```

---

## 5. Agent 编排逻辑

> **本章是系统的核心**。系统采用「1 个编排中心（Agent Orchestrator）+ 6 个专业 Agent」的多 Agent 协作架构，以数据流（结构化 JSON）串联，实现从「上传文件 → 对手标书自动归档与智能匹配 → 输出差距清单与修改建议」的全自动闭环。

### 5.1 Agent 体系总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator（编排中心）                       │
│     调度 6 个 Agent 按依赖顺序执行 · 汇总结果 · 给前端汇报状态           │
│     · 失败自动重试 · 输出统一存入 PostgreSQL issues 表 · 归档/推荐落库   │
└───┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
    │          │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼          ▼
 ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
 │Agent1│  │Agent2│  │Agent3│  │Agent4│  │Agent5│  │Agent6│
 │招标  │  │文档  │  │质量  │  │招标  │  │对手  │  │对手  │
 │公告  │  │解析  │  │自审  │  │要求  │  │对比  │  │标书  │
 │解析  │  │      │  │      │  │覆盖  │  │分析  │  │智能  │
 │      │  │      │  │      │  │      │  │      │  │匹配  │
 └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘
    │         │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼         ▼
 招标公告    我方+对手   我方标书   我方 vs   我方 vs   项目特征
 PDF→     PDF→结构化   缺漏/重复   招标要求   对手标书   vs 已有库
 硬性要求   字段 JSON    异常值     覆盖矩阵   差距清单   匹配推荐
 清单 JSON  各一份      +修改建议   ✅❌⚠️    🔴🟡🟢   对标书列表
```

**Agent 身份标识（系统内 `agent_name` 取值）**：

| Agent | agent_name（标识） | 中文名 | 核心产出 |
|:---:|--------------------|--------|---------|
| Agent1 | `parse_announcement` | 招标公告解析 | 硬性要求清单 JSON |
| Agent2 | `parse_document` | 文档解析 | 我方/对手结构化字段 JSON |
| Agent3 | `quality_check` | 质量自审 | 自审问题清单 JSON |
| Agent4 | `requirement_coverage` | 招标要求覆盖度 | 覆盖度矩阵 JSON |
| Agent5 | `competitor_compare` | 对手对比分析 | 差距清单 JSON（三级分级） |
| Agent6 | `competitor_match` | 对手标书智能匹配 | 对标书推荐列表 JSON（相似度评分） |

### 5.2 Agent 核心角色定位

| Agent | 角色定位 | 一句话职责 |
|:---:|---------|-----------|
| Orchestrator | **总调度/指挥中枢** | 按依赖调度 5 个 Agent、汇总结果、汇报状态、失败重试、结果落库 |
| Agent1 | **需求翻译官** | 把招标公告翻译成结构化的硬性要求清单 |
| Agent2 | **数据抽取器** | 把我方与对手标书抽取为可对比的统一结构化字段 |
| Agent3 | **内部质检员** | 自查我方标书的缺漏/重复/异常，输出建议 |
| Agent4 | **合规检查员** | 核对招标硬性要求与我方标书的覆盖情况 |
| Agent5 | **竞争分析师** | 逐字段对比我方与对手，产出分级差距与修改建议 |
| Agent6 | **对标推荐官** | 当项目无专属对手标书库时，基于项目核心特征匹配并推荐同类项目对标书 |

### 5.3 各 Agent 职责明细

#### Agent1 招标公告解析（parse_announcement）

| 项目 | 说明 |
|------|------|
| **职责** | 解析招标公告，提取硬性要求清单 |
| **触发条件** | 项目上传「招标公告」文件后，由 Orchestrator 在完整工作流中调度（或调试时单独触发） |
| **输入** | 招标公告 PDF 文本 |
| **输出 JSON** | `{requirements: [{category, item, is_mandatory, source_page}]}` |
| **核心逻辑** | ① PDF 文本提取（pdfplumber / PyMuPDF）<br>② LLM（deepseek-chat）识别硬性要求，按分类整理并结构化输出 |
| **分类** | 资质要求 / 技术参数要求 / 商务条款 / 截止日期 |
| **储能典型要求** | 电池类型（LFP 强制）/ 循环寿命 ≥ 6000 次 / 逆变器效率 ≥ 97.5% / IEC 62619 安全认证 / CE 认证 / VDE-AR-N 4105 并网标准 / 质保 ≥ 10 年 |
| **LLM 调用** | System Prompt 引导 LLM 从公告中提取储能硬性条款并结构化输出 |

#### Agent2 文档解析（parse_document）

| 项目 | 说明 |
|------|------|
| **职责** | 将我方标书与对手标书分别抽取为统一 Schema 的结构化字段 |
| **触发条件** | 项目上传「我方标书」「对手标书」文件后，由 Orchestrator 调度（支持多份对手标书，逐份解析） |
| **输入** | 我方标书 PDF + 对手标书 PDF（各一份） |
| **输出 JSON** | 每家公司一份：`{company_name, technical_params: {...}, commercial_terms: {...}, qualifications: {...}, pricing: {...}}` |
| **核心逻辑** | ① 分别提取两家 PDF 文本<br>② LLM 按统一 Schema 映射字段 |
| **Schema** | technical_params（技术参数）/ commercial_terms（商务条款）/ qualifications（资质）/ pricing（报价） |
| **储能技术参数 schema** | 见 [6.4 核心数据结构](#64-核心数据结构) |

#### Agent3 质量自审（quality_check）

| 项目 | 说明 |
|------|------|
| **职责** | 对我方标书做内部质检，发现缺漏/重复/异常并给建议 |
| **触发条件** | 依赖 Agent2 我方 JSON 产出后调度 |
| **输入** | Agent2 我方 JSON |
| **输出 JSON** | `{issues: [{type, field, current_value, severity, suggestion}]}` |
| **核心逻辑** | ① 规则校验（必填字段是否为空、数值是否在合理范围）<br>② LLM 判断字段合理性（报价是否异常低、技术参数是否遗漏） |
| **type** | missing（缺失）/ duplicate（重复）/ abnormal（异常值） |
| **储能校验规则示例** | ① 循环寿命必须 ≥ 3000 次才合理<br>② 逆变器效率应在 95%-99% 之间<br>③ CE/IEC 认证对欧洲市场是必填<br>④ 报价低于 0.1 欧元/Wh 可能异常 |
| **⚠️ 非强制** | 自审结果是建议，不是提交审批的硬门槛 |

#### Agent4 招标要求覆盖度（requirement_coverage）

| 项目 | 说明 |
|------|------|
| **职责** | 核对招标硬性要求是否被我方标书覆盖 |
| **触发条件** | 依赖 Agent1 硬性要求清单 + Agent2 我方 JSON 产出后调度 |
| **输入** | Agent1 硬性要求清单 + Agent2 我方 JSON |
| **输出 JSON** | `{coverage: [{req_item, category, our_status, evidence}]}` |
| **核心逻辑** | ① 逐字段匹配<br>② LLM 语义判断覆盖度 |
| **our_status** | ✅ covered（已覆盖）/ ❌ missing（缺失）/ ⚠️ not_met（不满足） |
| **储能示例** | 招标要求"循环寿命 ≥ 6000 次" → 我方标书写 5500 次 → ⚠️ not_met |

#### Agent5 对手对比分析（competitor_compare）

| 项目 | 说明 |
|------|------|
| **职责** | 逐字段对比我方与对手，产出分级差距清单与修改建议 |
| **触发条件** | 依赖 Agent2 我方 JSON + 对手 JSON 产出后调度 |
| **输入** | Agent2 我方 JSON + Agent2 对手 JSON |
| **输出 JSON** | `{gaps: [{field, category, our_value, opponent_value, severity, gap_description, suggestion}]}` |
| **核心逻辑** | ① 逐字段 diff<br>② LLM 业务推理差距严重度分级 |
| **severity** | 🔴 red（致命差距：如缺少 CE 认证、循环寿命低 30%+、报价高 20%+）<br>🟡 yellow（重要差距：如逆变器效率低 1%、质保少 2 年）<br>🟢 green（次要差距：如安装方式描述略差） |
| **储能对比示例** | 我方循环寿命 5000 次 vs 对手 Tesla Megapack 7000 次 → 🔴 致命差距，建议改用高循环电芯 |

#### Agent6 对手标书智能匹配（competitor_match）

| 项目 | 说明 |
|------|------|
| **职责** | 当项目未创建专属对手标书库（无已上传对手标书）时，基于项目核心特征在已有对手标书库中检索并推荐相似度最高的同类项目标书 |
| **触发条件** | ① 新建项目未上传对手标书时自动触发；② 项目详情手动触发「智能匹配对手标书」；③ 对手标书上传后的自动归档过程（元数据提取与索引建立）同步调用 |
| **输入** | 当前项目核心特征（行业领域 / 项目规模 / 技术参数 / 项目类型，来自项目信息 + Agent1/Agent2 结构化输出）+ 已有对手标书库全部条目（competitor_bid_entries） |
| **输出 JSON** | `{recommendations: [{source_entry_id, source_file_id, company_name, match_score, match_features, recommendation_reason}]}` |
| **核心逻辑** | ① 提取当前项目特征向量；② 在已有对手标书库中按 行业领域、项目规模、技术参数、项目类型 四类特征计算相似度；③ LLM 综合排序并生成推荐理由；④ 结果写入 bid_recommendations 并推送至对比分析模块 |
| **匹配特征** | industry_domain（行业领域）/ project_scale（项目规模）/ technical_params（技术参数）/ project_type（项目类型） |
| **相似度** | match_score 取值 0~1，按四类特征加权计算（MVP 可采用特征重叠度 + LLM 语义相似度） |
| **推荐动作** | 推荐列表自动推送至对比分析模块；用户「采用」后，该对标书进入 Agent2/Agent5 对比输入，可直接用于标书对比分析 |

### 5.4 工作流流转规则

#### 5.4.1 执行顺序与依赖关系

```
阶段⓪ 上传即归档（对手标书上传后自动触发，独立于主工作流）
   Agent6 对手标书智能匹配（当项目无专属对手标书库时触发）
   自动归档：对手标书 → 建库 → 分类存储 → 元数据记录 → 索引建立

阶段① 数据准备（无依赖，可并行）
   Agent1 招标公告解析 ──┐
                         ├── 独立执行
   Agent2 文档解析   ────┘

阶段② 分析加工（依赖阶段①产出）
   Agent3 质量自审       ← 依赖 Agent2（我方 JSON）
   Agent4 招标要求覆盖度  ← 依赖 Agent1（要求清单）+ Agent2（我方 JSON）
   Agent5 对手对比分析    ← 依赖 Agent2（我方 JSON + 对手 JSON，含被采用的对标书）

阶段③ 汇总落库
   Orchestrator 汇总 Agent 输出 → 统一写入 issues 表 / bid_recommendations 表 → 通知前端
```

> **MVP 执行策略**：主工作流按 1 → 2 → 3 → 4 → 5 顺序执行（架构文档的编号顺序）。Agent1 与 Agent2 之间无数据依赖，设计上可并行；MVP 为降低编排复杂度采用串行，并行作为后续优化项。Agent6 在「对手标书上传」或「无对手标书」时按需触发，不阻塞主工作流。

#### 5.4.2 完整工作流（单一操作闭环）

| 步骤 | 动作 | 系统行为 |
|:---:|------|---------|
| ① | 新建项目 | 填写项目信息 + 上传三件套（招标公告/我方标书/对手标书）；对手标书上传后自动归档入库；未上传对手标书时自动触发 Agent6 智能匹配并推荐对标书 |
| ② | 触发 Agent 群工作流 | Orchestrator 依次调度 5 个主流程 Agent（推荐对标书被采用后参与 Agent2/Agent5），输出自审清单 + 招标覆盖矩阵 + 对手差距表 + 修改建议 |
| ③ | 查看结果 → 修改标书 → 上传新版本 | 版本号递增；自审未通过也可继续（AI 自审是建议不是硬门槛） |
| ④ | 循环 ②③ 直到满意 | 每次运行记录版本号与结果 |
| ⑤ | 提交审批 | 仅当最新版本完整 Agent 工作流全部成功后才可用 |
| ⑥ | 自动三级审批（硬编码通过） | 技术负责人 ✅ → 法务 ✅ → 投标主管 ✅ |
| ⑦ | 归档 + 自动生成项目总报告 | 版本时间线 + 问题统计 + 耗时 + 导出 PDF |

#### 5.4.3 三条硬规则

| 规则 | 说明 | 系统约束 |
|------|------|---------|
| **自审非强制** | Agent3 质量自审的结果是"建议"而非"硬门槛" | 自审未通过，专员仍可进入对比环节或提交审批 |
| **AI 跑通才能提交审批** | 最新版本必须经过完整 Agent 工作流且所有 Agent 执行成功 | 「提交审批」按钮才可用（校验该版本全部 `agent_runs.status = success`） |
| **差距三级分级** | 所有差距项必须标注严重度 | 🔴致命 / 🟡重要 / 🟢次要，帮助专员排优先级 |

#### 5.4.4 对手标书自动归档与智能匹配流程（核心新增）

**流程一：上传对手标书 → 自动归档（触发于上传动作）**

```
用户上传对手标书 PDF
    │
    ├─ 1. 建库检查：本项目是否已创建专属对手标书库？
    │       ├─ 否 → 自动创建 competitor_bid_libraries 记录
    │       └─ 是 → 复用现有库
    ├─ 2. 分类存储：文件写入 MinIO，生成 files 记录（file_type = competitor_bid）
    ├─ 3. 元数据记录：抽取 公司名/行业领域/项目规模/项目类型/技术参数摘要 → 写入 competitor_bid_entries
    ├─ 4. 索引建立：生成 feature_vector（特征向量）→ 写入 competitor_bid_entries.index_status = indexed
    └─ 5. 更新库内条目数 entry_count，前端展示归档结果
```

**流程二：项目无专属对手标书库 → AI 智能匹配（触发于上传或手动）**

```
当前项目未创建专属对手标书库（无已上传对手标书）
    │
    ├─ 1. 特征提取：取当前项目 行业领域/项目规模/技术参数/项目类型 四类核心特征
    ├─ 2. 库内检索：在已有对手标书库（全部 competitor_bid_entries）中计算相似度
    ├─ 3. AI 排序：LLM 综合排序 + 生成推荐理由
    ├─ 4. 生成推荐：写入 bid_recommendations（match_score + match_features + recommendation_reason）
    └─ 5. 推送对比分析模块：推荐对标书列表展示，用户「采用」→ 直接调取用于标书对比分析
```

**匹配特征定义**：

| 特征 | 来源 | 说明 |
|------|------|------|
| 行业领域 industry_domain | 项目描述 + LLM 抽取 | 储能细分领域（户用/工商业/大型/EMS 等） |
| 项目规模 project_scale | 项目信息 + 技术参数 | 容量（MWh）、功率（MW）、时长（h） |
| 技术参数 technical_params | Agent2 结构化字段 | 电池类型/循环寿命/效率/认证等 |
| 项目类型 project_type | storage_type | residential / commercial / utility / ems_battery |

**推荐采纳闭环**：推荐对标书「采用」后 → 该对手标书进入对比分析输入 → 参与 Agent2 解析与 Agent5 对手对比 → 产生差距清单；「放弃」则保持 recommended 状态不进入对比。

### 5.5 协作机制

| 机制 | 说明 |
|------|------|
| **数据流协作** | Agent 之间不直接调用，而是通过 JSON 输入/输出串接；Orchestrator 持有上下文，将上游输出作为下游输入 |
| **输入输出存档** | 每次 Agent 运行的 `input_json` / `output_json` 完整存档到 `agent_runs` 表，保证可追溯、可重放 |
| **统一结果落库** | 5 个 Agent 的分析结论统一写入 `issues` 表（通过 `category` 区分 self_check / requirement_gap / competitor_gap，通过 `source_agent` 标记来源） |
| **状态汇报** | Orchestrator 实时向前端汇报每个 Agent 状态（排队中→解析中→抽取中→对比中→完成）与耗时 |
| **失败重试** | Agent 失败自动重试；单 Agent 支持手动重试（B3 运行历史 [重试] 按钮） |
| **版本隔离** | 所有 Agent 运行与问题均按 `version_no` 隔离，多轮迭代互不污染 |
| **自动归档协作** | 对手标书上传即归档：Orchestrator 调用 Agent6 完成建库、分类存储、元数据记录与索引建立，元数据/索引写入 competitor_bid_entries |
| **推荐-对比协作** | Agent6 推荐结果写入 bid_recommendations；用户「采用」后，被采用对标书作为 Agent2/Agent5 的对手输入参与对比分析 |

### 5.6 异常处理流程

| 异常场景 | 触发条件 | 处理策略 | 兜底方案 |
|---------|---------|---------|---------|
| Agent 执行失败 | LLM 返回错误/格式非法/超时 | Orchestrator 自动重试（默认上限 3 次） | 记录 `error_message`，状态置 `failed`，前端展示并可手动重试 |
| LLM 实时调用出错/太慢 | 网络/限流/模型不可用 | 自动重试 + 超时控制 | **提前生成 mock 数据**：3 份模拟标书 PDF + 预生成 Agent 输出 JSON，实时调不通直接读 JSON |
| PDF 扫描件无法提取文本 | 文本提取为空 | 标记解析失败，提示用户 | mock 标书全部用电子 PDF（非扫描件）；生产环境扩展 OCR |
| 单个 Agent 失败但整体继续 | 非阻断性 Agent 异常 | 记录失败状态，其余 Agent 继续 | 前端运行历史显示失败 + [重试]；「提交审批」仍被禁用（因不满足"AI 跑通"） |
| 依赖缺失 | 上游 Agent 未成功产出 | 下游 Agent 不执行，标记 `pending`/跳过 | 提示用户先修复上游 Agent |
| 归档失败 | MinIO 写入失败 / 元数据抽取失败 | 标记归档失败，提示重传；库记录回滚 | 重试归档；文件保留在临时区，不影响其他流程 |
| 索引建立失败 | 特征向量生成失败 | entry.index_status = failed，不影响归档 | 后续重新建立索引，匹配时跳过未索引条目 |
| 智能匹配无结果 | 已有对手标书库为空 / 相似度低于阈值 | 返回空推荐列表，提示用户手动上传对手标书 | 前端展示"暂无可匹配对标书"，提供上传入口 |

### 5.7 Agent 状态机

```
pending（排队中） → running（执行中） → success（成功）
                                    ↘ failed（失败） → [重试] → pending → running → ...
```

| 状态 | 说明 |
|------|------|
| `pending` | 已入队，等待执行 |
| `running` | 正在执行（解析中/抽取中/对比中等细分阶段由前端展示） |
| `success` | 执行成功，输出已存档 |
| `failed` | 执行失败，`error_message` 记录原因，可手动重试 |

---

## 6. 数据模型

### 6.1 实体关系图（ER）

```
users (用户)
  │ 1
  │
  ├──────────────< projects (项目)  1 ────< files (文件，按版本)
  │                    │ 1
  │                    ├──────────────< agent_runs (Agent 运行记录，按版本)
  │                    ├──────────────< issues (问题/差距清单，按版本)
  │                    ├──────────────< approvals (审批记录，按版本)
  │                    ├── 1:1 ──────── project_reports (项目总报告，归档时生成)
  │                    ├── 1:1 ──────── competitor_bid_libraries (对手标书库，每项目一个)
  │                    │                    │ 1
  │                    │                    └──────< competitor_bid_entries (库条目·元数据与索引)
  │                    └──────────────< bid_recommendations (对标书推荐记录)
  │                                        ▲
  └──────────────< approvals.approver_id ───┘ (审批人关联 users)
```

**关联关系说明**：

| 关系 | 方向 | 基数 | 说明 |
|------|------|:---:|------|
| users → projects | 用户创建项目 | 1 : N | `projects.creator_id → users.id` |
| projects → files | 项目拥有文件 | 1 : N | `files.project_id → projects.id`，按 `version_no` 分版本 |
| projects → agent_runs | 项目拥有运行记录 | 1 : N | `agent_runs.project_id → projects.id`，按 `version_no` 分版本 |
| projects → issues | 项目拥有问题清单 | 1 : N | `issues.project_id → projects.id`，按 `version_no` 分版本 |
| projects → approvals | 项目拥有审批记录 | 1 : N | `approvals.project_id → projects.id`，按 `version_no` 分版本 |
| users → approvals | 审批人 | 1 : N | `approvals.approver_id → users.id`（MVP 可硬编码） |
| projects → project_reports | 项目对应报告 | 1 : 1 | `project_reports.project_id → projects.id`（唯一约束，归档时生成） |
| projects → competitor_bid_libraries | 项目专属对手标书库 | 1 : 1 | `competitor_bid_libraries.project_id → projects.id`（唯一约束，上传对手标书时自动创建） |
| competitor_bid_libraries → competitor_bid_entries | 库包含条目 | 1 : N | `competitor_bid_entries.library_id → competitor_bid_libraries.id` |
| projects → competitor_bid_entries | 条目来源项目 | 1 : N | `competitor_bid_entries.project_id → projects.id` |
| files → competitor_bid_entries | 条目对应文件 | 1 : 1 | `competitor_bid_entries.file_id → files.id` |
| projects → bid_recommendations | 项目收到推荐 | 1 : N | `bid_recommendations.target_project_id → projects.id` |
| competitor_bid_entries → bid_recommendations | 被推荐条目 | 1 : N | `bid_recommendations.source_entry_id → competitor_bid_entries.id` |

### 6.2 核心实体定义（PostgreSQL）

#### 6.2.1 users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 用户 ID |
| name | VARCHAR(100) | 非空 | 姓名 |
| password_hash | VARCHAR(255) | 非空 | 密码哈希 |
| role | VARCHAR(50) | 非空 | 角色：bidder / tech_lead / legal / bid_director / admin |
| department | VARCHAR(100) | - | 部门 |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |
| updated_at | TIMESTAMP | - | 更新时间 |

#### 6.2.2 projects（项目表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 项目 ID |
| name | VARCHAR(200) | 非空 | 项目名称 |
| bidder | VARCHAR(200) | - | 招标方名称 |
| deadline | DATE | - | 投标截止日期 |
| region | VARCHAR(100) | - | 招标地区（如：德国/荷兰/西班牙/中国） |
| storage_type | VARCHAR(50) | - | 储能场景：residential / commercial / utility / ems_battery |
| description | TEXT | - | 项目描述 |
| status | VARCHAR(30) | 默认 draft | draft / in_progress / awaiting_approval / approved / archived / rejected |
| creator_id | UUID | 外键 → users.id | 创建人 |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |
| updated_at | TIMESTAMP | - | 更新时间 |

**项目状态流转**：

```
draft（草稿） → in_progress（进行中，已触发 Agent/已上传文件）
    → awaiting_approval（待审批，提交审批后）
    → approved（已通过，三级审批完成）
    → archived（已归档，生成总报告）
    （任意环节可 → rejected 驳回，MVP 简化）
```

#### 6.2.3 files（文件表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 文件 ID |
| project_id | UUID | 外键 → projects.id | 所属项目 |
| version_no | INTEGER | 非空 | 版本号（V1=1, V2=2...） |
| file_type | VARCHAR(30) | 非空 | announcement / our_bid / competitor_bid |
| original_name | VARCHAR(255) | - | 原始文件名 |
| minio_path | VARCHAR(500) | - | MinIO 存储路径 |
| minio_url | VARCHAR(500) | - | 访问 URL |
| file_size | BIGINT | - | 文件大小（字节） |
| uploader_id | UUID | 外键 → users.id | 上传人 |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |

#### 6.2.4 agent_runs（Agent 运行记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 运行 ID |
| project_id | UUID | 外键 → projects.id | 所属项目 |
| version_no | INTEGER | 非空 | 版本号 |
| agent_name | VARCHAR(50) | 非空 | parse_announcement / parse_document / quality_check / requirement_coverage / competitor_compare |
| status | VARCHAR(30) | 非空 | pending / running / success / failed |
| input_json | JSONB | - | Agent 输入完整存档 |
| output_json | JSONB | - | Agent 输出完整存档 |
| error_message | TEXT | - | 失败时的错误信息 |
| started_at | TIMESTAMP | - | 开始时间 |
| finished_at | TIMESTAMP | - | 结束时间 |
| duration_ms | INTEGER | - | 耗时（毫秒） |

#### 6.2.5 issues（问题/差距清单）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 问题 ID |
| project_id | UUID | 外键 → projects.id | 所属项目 |
| version_no | INTEGER | 非空 | 版本号 |
| category | VARCHAR(30) | 非空 | self_check / requirement_gap / competitor_gap |
| severity | VARCHAR(10) | 非空 | red / yellow / green |
| field_key | VARCHAR(200) | - | 字段标识 |
| field_label | VARCHAR(200) | - | 字段中文名 |
| our_value | TEXT | - | 我方值 |
| opponent_value | TEXT | - | 对手值（仅 competitor_gap） |
| gap_description | TEXT | - | 差距/问题描述 |
| suggestion | TEXT | - | 修改建议 |
| source_agent | VARCHAR(50) | - | 来源 Agent |
| is_resolved | BOOLEAN | 默认 false | 是否已解决 |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |

#### 6.2.6 approvals（审批记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 审批 ID |
| project_id | UUID | 外键 → projects.id | 所属项目 |
| version_no | INTEGER | 非空 | 版本号 |
| level | VARCHAR(30) | 非空 | tech_lead / legal / bid_director |
| approver_id | UUID | 外键 → users.id | 审批人（MVP 自动通过，可硬编码） |
| decision | VARCHAR(20) | - | approved / rejected |
| comment | TEXT | - | 审批意见 |
| auto_approved | BOOLEAN | 默认 true | 是否自动通过（MVP 全部为 true） |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |

#### 6.2.7 project_reports（项目总报告，归档时自动生成）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 报告 ID |
| project_id | UUID | 外键 → projects.id，唯一 | 所属项目（1:1） |
| total_versions | INTEGER | - | 总版本数 |
| total_duration_hours | DECIMAL(8,2) | - | 总耗时（小时） |
| self_check_issue_count | INTEGER | - | 自审问题总数 |
| requirement_gap_count | INTEGER | - | 招标要求差距总数 |
| competitor_gap_count | INTEGER | - | 对手差距总数 |
| version_history_json | JSONB | - | 每版本摘要 |
| issue_statistics_json | JSONB | - | 问题分类统计 |
| final_summary | TEXT | - | AI 生成的最终摘要 |
| generated_at | TIMESTAMP | - | 生成时间 |
| pdf_url | VARCHAR(500) | - | MinIO 中 PDF 的 URL |

#### 6.2.8 competitor_bid_libraries（对手标书库表，每项目一个）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 库 ID |
| project_id | UUID | 外键 → projects.id，唯一 | 所属项目（1:1） |
| library_name | VARCHAR(200) | - | 库名称（默认"{项目名}对手标书库"） |
| entry_count | INTEGER | 默认 0 | 收录对手标书条目数 |
| status | VARCHAR(30) | 默认 active | active / archived |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |
| updated_at | TIMESTAMP | - | 更新时间 |

#### 6.2.9 competitor_bid_entries（对手标书库条目·元数据与索引）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 条目 ID |
| library_id | UUID | 外键 → competitor_bid_libraries.id | 所属库 |
| project_id | UUID | 外键 → projects.id | 来源项目 |
| file_id | UUID | 外键 → files.id，唯一 | 原始文件 |
| company_name | VARCHAR(200) | - | 对手公司名 |
| industry_domain | VARCHAR(100) | - | 行业领域（储能细分） |
| project_scale | VARCHAR(100) | - | 项目规模（如 50MWh） |
| project_type | VARCHAR(50) | - | 项目类型：residential / commercial / utility / ems_battery |
| tech_params_json | JSONB | - | 技术参数摘要 |
| feature_vector | JSONB | - | 特征向量/索引（用于相似度计算） |
| index_status | VARCHAR(30) | 默认 indexing | indexing / indexed / failed |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |
| updated_at | TIMESTAMP | - | 更新时间 |

#### 6.2.10 bid_recommendations（对标书推荐记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | 主键 | 推荐 ID |
| target_project_id | UUID | 外键 → projects.id | 目标项目（当前项目） |
| source_entry_id | UUID | 外键 → competitor_bid_entries.id | 被推荐标书条目 |
| source_file_id | UUID | 外键 → files.id | 被推荐文件 |
| match_score | DECIMAL(5,4) | - | 相似度评分（0~1） |
| match_features_json | JSONB | - | 匹配特征明细（行业/规模/技术参数/类型逐项匹配） |
| recommendation_reason | TEXT | - | 推荐理由（LLM 生成） |
| status | VARCHAR(30) | 默认 recommended | recommended / adopted / dismissed |
| created_at | TIMESTAMP | 默认 now() | 创建时间 |
| updated_at | TIMESTAMP | - | 更新时间 |

### 6.3 枚举值规范

| 枚举 | 取值 |
|------|------|
| 用户角色 role | `bidder` / `tech_lead` / `legal` / `bid_director` / `admin` |
| 项目状态 status | `draft` / `in_progress` / `awaiting_approval` / `approved` / `archived` / `rejected` |
| 储能场景 storage_type | `residential`（户用）/ `commercial`（工商业）/ `utility`（大型）/ `ems_battery`（EMS+电池包） |
| 文件类型 file_type | `announcement`（招标公告）/ `our_bid`（我方标书）/ `competitor_bid`（对手标书） |
| Agent 名称 agent_name | `parse_announcement` / `parse_document` / `quality_check` / `requirement_coverage` / `competitor_compare` / `competitor_match` |
| Agent 状态 | `pending` / `running` / `success` / `failed` |
| 问题分类 category | `self_check` / `requirement_gap` / `competitor_gap` |
| 严重度 severity | `red`（🔴 致命）/ `yellow`（🟡 重要）/ `green`（🟢 次要） |
| 覆盖状态 our_status | `covered`（✅）/ `missing`（❌）/ `not_met`（⚠️） |
| 自审类型 type | `missing` / `duplicate` / `abnormal` |
| 审批级别 level | `tech_lead` / `legal` / `bid_director` |
| 审批决策 decision | `approved` / `rejected` |
| 对手标书库状态 | `active` / `archived` |
| 索引状态 index_status | `indexing` / `indexed` / `failed` |
| 推荐状态 | `recommended`（已推荐）/ `adopted`（已采用）/ `dismissed`（已放弃） |

### 6.4 核心数据结构（JSON Schema）

#### 6.4.1 Agent1 输出（招标硬性要求清单）

```json
{
  "requirements": [
    {"category": "技术参数", "item": "电池类型必须为 LFP（磷酸铁锂）", "is_mandatory": true, "source_page": 12},
    {"category": "技术参数", "item": "循环寿命 ≥ 6000 次（80% DoD）", "is_mandatory": true, "source_page": 15}
  ]
}
```

#### 6.4.2 Agent2 输出（我方/对手结构化字段）

```json
{
  "company_name": "沃太能源",
  "technical_params": {
    "battery_type": "LFP",
    "rated_capacity_kwh": 50000,
    "rated_power_kw": 25000,
    "storage_duration_h": 2,
    "cycle_life": 5500,
    "inverter_efficiency": 97.0,
    "system_efficiency": 89.5,
    "energy_density_whl": 245,
    "dod": 95,
    "warranty_years": 10,
    "certifications": ["IEC 62619", "UN38.3", "CE"],
    "ems_integrated": true,
    "bms_type": "主动均衡",
    "install_type": "工商业",
    "grid_mode": "并网"
  },
  "commercial_terms": {},
  "qualifications": {},
  "pricing": {
    "total_price_eur": 14500000,
    "price_per_wh_eur": 0.29
  }
}
```

#### 6.4.3 Agent3 输出（自审问题清单）

```json
{
  "issues": [
    {"type": "missing", "field": "vde_certification", "current_value": null,
     "severity": "red", "suggestion": "缺少 VDE-AR-N 4105 并网认证，德国市场强制要求，必须补充"}
  ]
}
```

#### 6.4.4 Agent4 输出（覆盖度矩阵）

```json
{
  "coverage": [
    {"req_item": "循环寿命 ≥ 6000 次", "category": "技术参数",
     "our_status": "not_met", "evidence": "我方标书写 5500 次"}
  ]
}
```

#### 6.4.5 Agent5 输出（对手差距清单）

```json
{
  "gaps": [
    {"field": "cycle_life", "category": "technical_params",
     "our_value": "5500 次", "opponent_value": "7000 次",
     "severity": "red",
     "gap_description": "循环寿命低于对手 1500 次，在长期使用成本上处于劣势",
     "suggestion": "改用高循环 LFP 电芯，目标 ≥ 6500 次"}
  ]
}
```

#### 6.4.6 Agent6 输出（对标书推荐列表）

```json
{
  "recommendations": [
    {
      "source_entry_id": "uuid-entry-001",
      "source_file_id": "uuid-file-001",
      "company_name": "Tesla Energy",
      "match_score": 0.92,
      "match_features": {
        "industry_domain": "工商业储能",
        "project_scale": "50MWh",
        "technical_params": ["LFP", "cycle_life≥6000", "inverter_efficiency≥97.5%"],
        "project_type": "commercial"
      },
      "recommendation_reason": "同属工商业储能、容量规模一致，技术参数高度重合，适合作为对标对象"
    }
  ]
}
```

#### 6.4.7 对手标书库条目元数据（competitor_bid_entries）

```json
{
  "company_name": "Tesla Energy",
  "industry_domain": "工商业储能",
  "project_scale": "50MWh / 25MW / 2h",
  "project_type": "commercial",
  "tech_params_json": {
    "battery_type": "LFP",
    "cycle_life": 7000,
    "inverter_efficiency": 98.0,
    "certifications": ["IEC 62619", "UN38.3", "CE", "VDE-AR-N 4105"]
  },
  "feature_vector": {"battery": "LFP", "scale_mwh": 50, "type": "commercial", "region": "DE"}
}
```

---

## 7. 非功能需求与验收标准

### 7.1 技术架构约束（与架构设计一致）

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React | 18+ | SPA 应用 |
| UI 组件库 | Ant Design | 5.x | 表格/Tab/Card/Drawer 等 |
| 后端框架 | Node.js Express | 4.x | REST API |
| PDF 解析 | pdfplumber / PyMuPDF | latest | PDF 文本提取 |
| LLM | deepseek-chat | - | Agent 推理核心 |
| 数据库 | PostgreSQL | 15 | 业务数据持久化 |
| 对象存储 | MinIO | latest | PDF 文件存储 |
| 缓存（可选） | Redis | 7 | 会话/任务状态缓存 |
| 容器化 | Docker Compose | latest | 一键部署三组件 |

### 7.2 关键验收标准

| 验收项 | 验收标准 |
|--------|---------|
| 项目闭环 | 新建项目 → 触发 Agent → 迭代 → 提交审批 → 归档 → 报告导出全流程可走通 |
| Agent 工作流 | 6 个 Agent（含对手标书智能匹配）按依赖顺序执行成功，输入/输出完整存档 |
| 差距分级 | 所有差距项均标注 🔴/🟡/🟢 等级 |
| 覆盖度矩阵 | 每条硬性要求输出 ✅/❌/⚠️ |
| 提交审批门槛 | 非"AI 跑通"版本，「提交审批」按钮禁用 |
| 自审非强制 | 自审存在 red 问题时，仍可继续对比与提交审批 |
| 报告导出 | 归档后生成项目总报告并可导出 PDF |
| 异常兜底 | LLM 不可用时可用 mock 数据完整演示流程 |
| 对手标书自动归档 | 上传对手标书后自动建库、分类存储、元数据记录、索引建立，条目可查 |
| 智能匹配 | 项目无专属对手标书库时自动触发匹配，返回相似度最高的同类项目对标书（含得分与理由） |
| 推荐调取 | 推荐对标书可在对比分析模块「采用」并直接调取用于标书对比分析 |

---

## 8. 附录

### 8.1 MVP vs 扩展功能对照表

| 功能模块 | MVP 实现 | 设计完整度 | PPT 展示 |
|---------|:--------:|:---------:|:--------:|
| 项目全生命周期（新建→迭代→审批→归档） | ✅ 硬编码审批通过 | 100% | ✅ 完整流程图 |
| 5 Agent 工作流（完整编排） | ✅ | 100% | ✅ Agent 架构图 |
| 🔴🟡🟢 差距三级分级 | ✅ | 100% | ✅ 差距清单截图 |
| 自审非强制规则 | ✅ | 100% | ✅ PRD 写明 |
| AI 跑通才能提交审批 | ✅ | 100% | ✅ PRD 写明 |
| 版本 Diff 对比 | ✅ | 100% | ✅ |
| 项目总报告（自动生成） | ✅ | 90% | ✅ 截图 |
| 三级审批独立页面（技术/法务/主管） | 📄 仅流程图 | 100% | ✅ PPT 架构图 |
| Admin 用户 CRUD | 🔧 硬编码 4 用户 | 80% | ✅ 架构图体现 |
| Agent 参数/Prompt 配置 | 📄 | 100% | ✅ PPT 未来规划 |
| 对手标书自动归档与智能匹配（A8/A9 + Agent6） | ✅ | 100% | ✅ PRD 写明 + 截图 |
| 历史标书库（自动收录 + 管理端浏览） | 🔧 收录已实现 / 管理端 📄 | 100% | ✅ PPT 未来规划 |
| 跨项目总报告（中标率统计） | 📄 | 100% | ✅ PPT 未来规划 |
| 修改建议一键生成下载文档 | 📄 | 100% | ✅ PPT 未来规划 |

### 8.2 风险与兜底方案

| 风险 | 发生概率 | 兜底方案 |
|------|:--------:|---------|
| Agent 实时调 LLM 出错/太慢 | 高 | 提前生成 mock 数据：3 份模拟标书 PDF + 预生成 Agent 输出 JSON，实时调不通直接读 JSON |
| PDF 扫描件无法提取文本 | 中 | mock 标书全部用电子 PDF（非扫描件），PPT 说明生产环境扩展 OCR |
| 前端 API 联调卡住 | 中 | 先用 hardcode mock 数据展示 UI，截图不受影响 |
| Docker 镜像拉取网络卡壳 | 低 | 提前启动 Docker 拉镜像，或用本地已有镜像 |
| 某个 P0 页面做不完 | 低 | 用 Ant Design 现成组件，不自定义样式 |

### 8.3 术语表

| 术语 | 说明 |
|------|------|
| 三件套 | 招标公告 + 我方标书 + 对手标书 |
| Orchestrator | Agent 编排中心，负责调度、汇总、状态汇报、失败重试 |
| 硬性要求 | 招标公告中 `is_mandatory = true` 的条款 |
| 覆盖度矩阵 | 招标要求与我方标书的 ✅/❌/⚠️ 匹配结果 |
| 差距清单 | 我方与对手逐字段对比的分级差距列表 |
| 三级分级 | 🔴 致命 / 🟡 重要 / 🟢 次要 |
| 自审非强制 | Agent3 结果为建议，非提交审批硬门槛 |
| AI 跑通 | 最新版本全部 Agent 执行成功，是提交审批的前置条件 |
| DoD | Depth of Discharge，放电深度 |
| LFP | 磷酸铁锂电池 |
| VDE-AR-N 4105 | 德国低压并网标准 |
| 对手标书库 | 每个项目专属的对手标书归档库（分类存储 + 元数据 + 索引） |
| 对标书 | 被 AI 智能匹配推荐、用于对比分析的同类项目对手标书 |
| 智能匹配 | 基于行业领域/项目规模/技术参数/项目类型检索并推荐相似标书 |
| 相似度评分 | match_score，0~1 区间，衡量对标书与当前项目的匹配程度 |
| 特征向量 | feature_vector，对手标书用于相似度检索的索引表示 |

### 8.4 储能场景 Mock 数据示例

> 用于开发阶段兜底数据，确保 Agent 调用失败时 demo 仍可运行。完整 JSON 示例见《产品架构设计.md》第十一章。

**示例项目：德国 50MWh 工商业储能招标**

| 字段 | 值 |
|------|-----|
| 项目名称 | 德国巴伐利亚州 50MWh 工商业储能项目 |
| 招标方 | EnBW Energy Solutions GmbH |
| 招标地区 | 德国 |
| 储能场景 | commercial（工商业储能） |
| 投标截止日期 | 2026-12-15 |

**关键 mock 结论**：

- 招标硬性要求 9 条（含 LFP 电池、循环寿命 ≥ 6000 次、逆变器效率 ≥ 97.5%、IEC 62619/CE/VDE 认证、质保 ≥ 10 年等）。
- 我方（沃泰）循环寿命 5500 次、逆变器效率 97.0%、缺 VDE 认证、报价 €14,500,000。
- 对手（Tesla Megapack）循环寿命 7000 次、逆变器效率 98.0%、含 VDE 认证、报价 €13,800,000。
- 产出自审问题 3 项、对手差距 5 项（3 红 2 黄），详见架构文档 JSON 示例。

**智能匹配 mock 示例（Agent6 输出）**：当前项目"德国 50MWh 工商业储能"未上传对手标书 → Agent6 在已有对手标书库中检索，匹配到 Tesla Megapack 50MWh 工商业储能标书（match_score = 0.92），推荐理由"同属工商业储能、容量规模一致、技术参数高度重合"，推荐到对比分析模块供用户采用。

---

*文档结束*
