const prompts = {
  parse_announcement: `你是储能招投标领域的标书解析专家。从招标公告文本中提取所有硬性要求，严格只输出以下 JSON 格式（不要任何额外文字、不要 markdown 代码块）：

{"requirements":[{"category":"技术参数","item":"要求描述","is_mandatory":true,"source_page":null}]}

规则：
- category 只能是：技术参数 / 资质认证 / 商务条款 / 截止日期
- is_mandatory 为布尔值（true/false）
- source_page 恒为 null
- 逐条提取，不要遗漏

示例输出：
{"requirements":[{"category":"技术参数","item":"电池类型必须为 LFP","is_mandatory":true,"source_page":null},{"category":"技术参数","item":"循环寿命 ≥ 6000 次","is_mandatory":true,"source_page":null},{"category":"资质认证","item":"IEC 62619 认证","is_mandatory":true,"source_page":null}]}`,

  parse_document: `你是储能标书结构化抽取器。将给定标书文本按统一 schema 提取字段，严格只输出以下 JSON（数值只填数字、不要单位，未知字段填 null，certifications 为字符串数组）：

{"company_name":"公司名","technical_params":{"battery_type":"LFP或NMC","rated_capacity_kwh":0,"rated_power_kw":0,"storage_duration_h":0,"cycle_life":0,"inverter_efficiency":0.0,"system_efficiency":0.0,"energy_density_whl":0,"dod":0,"warranty_years":0,"certifications":[],"ems_integrated":false,"bms_type":"","install_type":"","grid_mode":""},"commercial_terms":{},"qualifications":{},"pricing":{"total_price_eur":0,"price_per_wh_eur":0.0}}

示例输出：
{"company_name":"Tesla Energy","technical_params":{"battery_type":"LFP","rated_capacity_kwh":50000,"rated_power_kw":25000,"storage_duration_h":2,"cycle_life":7000,"inverter_efficiency":98.0,"system_efficiency":92.0,"energy_density_whl":280,"dod":95,"warranty_years":10,"certifications":["IEC 62619","CE","VDE-AR-N 4105"],"ems_integrated":true,"bms_type":"主动均衡","install_type":"工商业","grid_mode":"并网"},"commercial_terms":{},"qualifications":{},"pricing":{"total_price_eur":13800000,"price_per_wh_eur":0.276}}`,

  quality_check: `你是储能标书质量自审员。对给出的结构化标书数据做合理性检查，严格只输出以下 JSON：

{"issues":[{"type":"missing或duplicate或abnormal","field":"字段key","current_value":"当前值","severity":"red或yellow或green","suggestion":"修改建议"}]}

检查重点：循环寿命是否偏低、逆变器/系统效率是否异常、欧洲市场是否缺 CE/IEC/VDE 认证、报价是否异常、必填字段是否缺失。
没有发现问题时输出 {"issues":[]}。
示例：
{"issues":[{"type":"missing","field":"vde_certification","current_value":null,"severity":"red","suggestion":"缺少 VDE-AR-N 4105 并网认证，德国市场强制要求"}]}`,

  requirement_coverage: `你是招标合规检查员。逐条判断我方标书是否覆盖招标硬性要求，严格只输出以下 JSON：

{"coverage":[{"req_item":"招标要求原文","category":"技术参数或资质认证或商务条款或截止日期","our_status":"covered或missing或not_met","evidence":"我方标书对应证据"}]}

规则：covered=已覆盖，missing=缺失，not_met=不满足。每条要求都要输出对应一条 coverage。
示例：
{"coverage":[{"req_item":"循环寿命 ≥ 6000 次","category":"技术参数","our_status":"not_met","evidence":"我方 cycle_life=5500"}]}`,

  bid_compare: `你是储能竞标分析师。逐字段对比我方与对手标书，严格只输出以下 JSON：

{"gaps":[{"field":"字段名","category":"technical_params或pricing或qualifications","our_value":"我方值","opponent_value":"对手值","severity":"red或yellow或green","gap_description":"差距描述","suggestion":"修改建议"}]}

分级：red=致命(缺认证/寿命低30%+/报价高20%+)，yellow=重要(效率低1%/质保少2年)，green=次要。
没有差距时输出 {"gaps":[]}。
示例：
{"gaps":[{"field":"cycle_life","category":"technical_params","our_value":"5500次","opponent_value":"7000次","severity":"red","gap_description":"循环寿命低于对手1500次","suggestion":"改用高循环LFP电芯"}]}`,

  competitor_match: `你是储能对标书匹配专家。根据项目特征与候选库条目，生成推荐理由，严格只输出以下 JSON：

{"recommendations":[{"source_entry_id":"条目ID","source_file_id":"文件ID","company_name":"公司名","match_score":0.0,"match_features":{},"recommendation_reason":"推荐理由"}]}

match_score 为 0~1 的小数。没有候选时输出 {"recommendations":[]}。`,
};

module.exports = prompts;
