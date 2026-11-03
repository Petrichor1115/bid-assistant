/**
 * 规则/阈值（分级规则 + 匹配特征权重）。
 */

// Agent3 自审硬规则（先于 LLM）
function selfCheckRules(doc) {
  const issues = [];
  if (!doc || typeof doc !== 'object') return issues;
  const tp = doc.technical_params || {};
  const certs = Array.isArray(tp.certifications) ? tp.certifications : [];

  if (tp.cycle_life != null && tp.cycle_life < 3000) {
    issues.push({ type: 'abnormal', field: 'cycle_life', current_value: tp.cycle_life, severity: 'yellow', suggestion: '循环寿命低于 3000 次，异常' });
  }
  if (tp.inverter_efficiency != null && (tp.inverter_efficiency < 95 || tp.inverter_efficiency > 99)) {
    issues.push({ type: 'abnormal', field: 'inverter_efficiency', current_value: tp.inverter_efficiency, severity: 'yellow', suggestion: '逆变器效率不在 95~99 区间' });
  }
  const hasCE = certs.some((c) => /CE/i.test(String(c)));
  const hasIEC = certs.some((c) => /IEC/i.test(String(c)));
  if (!hasCE || !hasIEC) {
    issues.push({ type: 'missing', field: 'certifications', current_value: certs, severity: 'red', suggestion: '欧洲市场缺 CE/IEC 认证' });
  }
  if (doc.pricing && doc.pricing.price_per_wh_eur != null && doc.pricing.price_per_wh_eur < 0.1) {
    issues.push({ type: 'abnormal', field: 'price_per_wh_eur', current_value: doc.pricing.price_per_wh_eur, severity: 'yellow', suggestion: '单价低于 0.1 EUR/Wh，异常' });
  }
  return issues;
}

// 匹配特征权重（缺失特征对应权重为 0）
const MATCH_WEIGHTS = { project_type: 0.3, industry_domain: 0.2, project_scale: 0.25, technical_params: 0.25 };
const MATCH_THRESHOLD = 0.5;
const MATCH_TOP_N = 5;

// 特征优先级
const FEATURE_PRIORITY = ['project_type', 'industry_domain', 'project_scale', 'technical_params'];

module.exports = { selfCheckRules, MATCH_WEIGHTS, MATCH_THRESHOLD, MATCH_TOP_N, FEATURE_PRIORITY };
