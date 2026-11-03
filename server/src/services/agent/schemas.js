/**
 * 各 Agent 输出结构校验（容错：字段缺失时归一化，不抛错）。
 */
const validators = {
  parse_announcement(output) {
    if (!output || !Array.isArray(output.requirements)) return { requirements: [] };
    return output;
  },
  parse_document(output) {
    if (!output || typeof output !== 'object') return {};
    return output;
  },
  quality_check(output) {
    if (!output || !Array.isArray(output.issues)) return { issues: [] };
    return output;
  },
  requirement_coverage(output) {
    if (!output || !Array.isArray(output.coverage)) return { coverage: [] };
    return output;
  },
  bid_compare(output) {
    if (!output || !Array.isArray(output.gaps)) return { gaps: [] };
    return output;
  },
  competitor_match(output) {
    if (!output || !Array.isArray(output.recommendations)) return { recommendations: [] };
    return output;
  },
};

function validate(agentName, output) {
  const fn = validators[agentName];
  return fn ? fn(output) : output;
}

module.exports = { validate };
