# 09 · 附录与 Mock 数据

> 本章提供术语、枚举速查、完整 mock 数据与风险兜底，供 AI 造测试数据。

## 1. 术语表

| 术语 | 说明 |
|------|------|
| 三件套 | 招标公告 + 我方标书 + 对手标书 |
| Orchestrator | Agent 编排中心，调度/汇总/状态汇报/失败重试 |
| 硬性要求 | 招标公告中 `is_mandatory=true` 的条款 |
| 覆盖度矩阵 | 招标要求与我方标书的 ✅/❌/⚠️ 匹配 |
| 差距清单 | 我方与对手逐字段对比的分级差距 |
| 三级分级 | 🔴 red / 🟡 yellow / 🟢 green |
| 自审非强制 | Agent3 结果为建议，不阻断 |
| AI 跑通 | 最新版本全部主流程 Agent success |
| 对手标书库 | 项目专属对手标书归档库（存储+元数据+索引） |
| 对标书 | AI 匹配推荐用于对比的同类标书 |
| 相似度评分 | match_score 0~1 |
| 特征向量 | feature_vector，相似度检索索引 |
| 竞标对比 | 原「标书对比/对比分析」统一命名：我方 vs 对手逐字段差距分级（bid_gap） |
| 置灰 | 视觉置灰、可点击，点击弹 Toast「敬请期待」（迭代功能占位） |
| 写死 | 前端硬编码静态渲染、不可交互（如标讯推荐） |
| DoD | 放电深度 |
| LFP | 磷酸铁锂 |
| VDE-AR-N 4105 | 德国低压并网标准 |

## 2. 枚举速查

- role：`bidder / tech_lead / legal / bid_director / admin`
- project.status：`draft / in_progress / awaiting_approval / approved / archived / rejected`
- storage_type：`residential / commercial / utility / ems_battery`
- file_type：`announcement / our_bid / competitor_bid`
- agent_name：`parse_announcement / parse_document / quality_check / requirement_coverage / bid_compare / competitor_match`
- agent.status：`pending / running / success / failed`
- issue.category：`self_check / requirement_gap / bid_gap`
- issue.severity：`red / yellow / green`
- approval.level：`tech_lead / legal / bid_director`
- approval.decision：`approved / rejected`
- library.status：`active / archived`
- entry.index_status：`indexing / indexed / failed`
- recommendation.status：`recommended / adopted / dismissed`

### 2.1 标讯推荐 Mock（对话式主页写死，5 条）

> 前端硬编码静态数据，不可交互。图标为 AI 生成的 SVG 矢量占位图（存放于 `web-user/src/assets/tenders/*.svg`，每条对应一个储能类型）。

| # | 储能类型 | SVG 资源 | 标讯名称示例 |
|---|---------|---------|-------------|
| 1 | 户用储能 | residential.svg | 德国北威州户用储能系统采购招标 |
| 2 | 工商业储能 | commercial.svg | 巴伐利亚 50MWh 工商业储能 EPC 招标 |
| 3 | 大型储能 | utility.svg | 西班牙 200MW/400MWh 大型储能电站招标 |
| 4 | EMS | ems.svg | 欧洲多站点 EMS 能源管理平台招标 |
| 5 | 电池包 | battery.svg | 波兰 1GWh LFP 电池包框架采购招标 |

## 3. Mock 数据（德国 50MWh 工商业储能）

### 3.1 示例项目

| 字段 | 值 |
|------|-----|
| 项目名称 | 德国巴伐利亚州 50MWh 工商业储能项目 |
| 招标方 | EnBW Energy Solutions GmbH |
| 招标地区 | 德国 |
| 储能场景 | commercial |
| 投标截止日期 | 2026-12-15 |

### 3.2 模拟 PDF 文件（mock/）

> 用 pdfkit 生成 3 份电子 PDF（非扫描件），内容为下方 JSON 的自然语言描述，保证 pdf-parse 可提取。

- `mock/pdfs/announcement.pdf`（招标公告）
- `mock/pdfs/our_bid.pdf`（我方沃泰标书）
- `mock/pdfs/competitor_tesla.pdf`（对手 Tesla Megapack 标书）

### 3.3 Agent1 输出（mock/agent1.json）

```json
{ "requirements": [
  { "category": "技术参数", "item": "电池类型必须为 LFP", "is_mandatory": true, "source_page": null },
  { "category": "技术参数", "item": "系统容量 ≥ 50MWh", "is_mandatory": true, "source_page": null },
  { "category": "技术参数", "item": "循环寿命 ≥ 6000 次（80% DoD）", "is_mandatory": true, "source_page": null },
  { "category": "技术参数", "item": "逆变器效率 ≥ 97.5%", "is_mandatory": true, "source_page": null },
  { "category": "资质认证", "item": "IEC 62619 电池安全认证", "is_mandatory": true, "source_page": null },
  { "category": "资质认证", "item": "CE 认证", "is_mandatory": true, "source_page": null },
  { "category": "资质认证", "item": "VDE-AR-N 4105 并网标准", "is_mandatory": true, "source_page": null },
  { "category": "商务条款", "item": "质保期 ≥ 10 年", "is_mandatory": true, "source_page": null },
  { "category": "商务条款", "item": "投标截止日期 2026-12-15", "is_mandatory": true, "source_page": null }
] }
```

### 3.4 Agent2 我方输出（mock/our_doc.json）

```json
{ "company_name": "沃太能源",
  "technical_params": {
    "battery_type": "LFP", "rated_capacity_kwh": 50000, "rated_power_kw": 25000,
    "storage_duration_h": 2, "cycle_life": 5500, "inverter_efficiency": 97.0,
    "system_efficiency": 89.5, "energy_density_whl": 245, "dod": 95,
    "warranty_years": 10, "certifications": ["IEC 62619", "UN38.3", "CE"],
    "ems_integrated": true, "bms_type": "主动均衡", "install_type": "工商业", "grid_mode": "并网"
  },
  "pricing": { "total_price_eur": 14500000, "price_per_wh_eur": 0.29 } }
```

### 3.5 Agent2 对手输出（mock/opponent_doc.json）

```json
{ "company_name": "Tesla Energy",
  "technical_params": {
    "battery_type": "LFP", "rated_capacity_kwh": 50000, "rated_power_kw": 25000,
    "storage_duration_h": 2, "cycle_life": 7000, "inverter_efficiency": 98.0,
    "system_efficiency": 92.0, "energy_density_whl": 280, "dod": 95,
    "warranty_years": 10, "certifications": ["IEC 62619", "UN38.3", "CE", "VDE-AR-N 4105"],
    "ems_integrated": true, "bms_type": "主动均衡", "install_type": "工商业", "grid_mode": "并网"
  },
  "pricing": { "total_price_eur": 13800000, "price_per_wh_eur": 0.276 } }
```

### 3.6 Agent3 输出（mock/agent3.json）

```json
{ "issues": [
  { "type": "abnormal", "field": "cycle_life", "current_value": 5500, "severity": "yellow",
    "suggestion": "循环寿命 5500 次，低于行业主流 6000+，建议补充高循环版本数据" },
  { "type": "missing", "field": "vde_certification", "current_value": null, "severity": "red",
    "suggestion": "缺少 VDE-AR-N 4105 并网认证，德国市场强制要求，必须补充" },
  { "type": "abnormal", "field": "inverter_efficiency", "current_value": 97.0, "severity": "yellow",
    "suggestion": "逆变器效率 97.0%，略低于招标要求 97.5%，建议更新为最新方案" }
] }
```

### 3.7 Agent5 输出（mock/agent5.json）

```json
{ "gaps": [
  { "field": "cycle_life", "our_value": "5500 次", "opponent_value": "7000 次", "severity": "red",
    "gap_description": "循环寿命低于对手 1500 次", "suggestion": "改用高循环 LFP 电芯，目标 ≥ 6500 次" },
  { "field": "inverter_efficiency", "our_value": "97.0%", "opponent_value": "98.0%", "severity": "yellow",
    "gap_description": "逆变器效率低 1 个百分点", "suggestion": "采用更高效率逆变器方案" },
  { "field": "system_efficiency", "our_value": "89.5%", "opponent_value": "92.0%", "severity": "yellow",
    "gap_description": "系统综合效率低 2.5 个百分点", "suggestion": "优化 BMS 均衡策略和热管理" },
  { "field": "total_price_eur", "our_value": "€14,500,000", "opponent_value": "€13,800,000", "severity": "red",
    "gap_description": "总报价高于对手 €700,000（约 5%）", "suggestion": "评估成本结构，批量采购降本或调利润率" },
  { "field": "vde_certification", "our_value": "无", "opponent_value": "已认证", "severity": "red",
    "gap_description": "缺少德国并网强制认证，直接废标风险", "suggestion": "立即启动 VDE-AR-N 4105 认证申请" }
] }
```

### 3.8 Agent6 输出（mock/agent6.json）

```json
{ "recommendations": [
  { "source_entry_id": "entry-tesla-001", "source_file_id": "file-tesla-001",
    "company_name": "Tesla Energy", "match_score": 0.92,
    "match_features": { "industry_domain": "工商业储能", "project_scale": "50MWh",
      "technical_params": ["LFP", "cycle_life≥6000", "inverter_efficiency≥97.5%"],
      "project_type": "commercial" },
    "recommendation_reason": "同属工商业储能、容量规模一致，技术参数高度重合，适合作为对标对象" }
] }
```

### 3.9 种子项目 + 库条目（seed 可选）

```sql
INSERT INTO projects (id, name, bidder, deadline, region, storage_type, capacity_mwh, power_mw, duration_h, status, creator_id) VALUES
  ('p-demo-001', '德国巴伐利亚州 50MWh 工商业储能项目', 'EnBW Energy Solutions GmbH',
   '2026-12-15', '德国', 'commercial', 50, 25, 2, 'draft', 'u-bidder-001');

INSERT INTO competitor_bid_libraries (id, project_id, library_name, entry_count) VALUES
  ('lib-demo-001', 'p-demo-001', '德国巴伐利亚州 50MWh 工商业储能项目对手标书库', 1);

INSERT INTO files (id, project_id, version_no, file_type, original_name, storage_path, storage_url, uploader_id) VALUES
  ('file-tesla-001', 'p-demo-001', 1, 'competitor_bid', 'Tesla_Megapack_bid.pdf',
   'uploads/tesla.pdf', '/uploads/tesla.pdf', 'u-bidder-001');

INSERT INTO competitor_bid_entries (id, library_id, project_id, file_id, company_name,
  industry_domain, project_scale, project_type, tech_params_json, feature_vector, index_status) VALUES
  ('entry-tesla-001', 'lib-demo-001', 'p-demo-001', 'file-tesla-001', 'Tesla Energy',
   '工商业储能', '50MWh / 25MW / 2h', 'commercial',
   '{"battery_type":"LFP","cycle_life":7000,"inverter_efficiency":98.0}',
   '{"battery":"LFP","scale_mwh":50,"type":"commercial","region":"DE"}', 'indexed');
```

## 4. 风险与兜底

| 风险 | 概率 | 兜底 |
|------|:---:|------|
| LLM 出错/无 Key | 高 | MockProvider 读 mock/*.json |
| PDF 扫描件无文本 | 中 | mock PDF 均为电子版；生产扩展 OCR |
| 前端联调卡 | 中 | 后端契约明确，前端可先用 mock 数据 |
| MySQL 未安装/不可用 | 中 | `db:provision` 自动安装（Docker 镜像优先，其次包管理器）；或改用 `CLOUD_DB_URL` 云 MySQL |
| 智能匹配无结果 | 中 | 返回空列表 + 提示上传对手标书 |
