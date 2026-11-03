const { chat } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');

/**
 * Agent6 智能匹配：项目特征 + 候选条目 -> recommendations（reason 生成）。
 */
async function agent6(input) {
  const messages = [
    { role: 'system', content: prompts.competitor_match },
    { role: 'user', content: JSON.stringify(input) },
  ];
  const raw = await chat(messages, { agentName: 'competitor_match' });
  return schemas.validate('competitor_match', JSON.parse(raw));
}

module.exports = agent6;
