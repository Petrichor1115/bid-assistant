const { chat, isMock } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');
const rules = require('../rules');

function mergeIssues(ruleIssues, llmIssues) {
  const map = new Map();
  for (const iss of [...ruleIssues, ...(llmIssues || [])]) {
    map.set(`${iss.type}|${iss.field}`, iss);
  }
  return Array.from(map.values());
}

/**
 * Agent3 质量自审：规则（先）+ LLM（补充）。
 */
async function agent3(input) {
  const ruleIssues = rules.selfCheckRules(input.our_doc);
  const messages = [
    { role: 'system', content: prompts.quality_check },
    { role: 'user', content: JSON.stringify(input.our_doc) },
  ];
  const raw = await chat(messages, { agentName: 'quality_check' });
  const out = schemas.validate('quality_check', JSON.parse(raw));
  // mock 模式下 mock 已含规则结果，直接用 mock；真实模式合并规则 + LLM
  if (isMock()) return { issues: out.issues || [] };
  return { issues: mergeIssues(ruleIssues, out.issues || []) };
}

module.exports = agent3;
