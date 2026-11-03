const { chat } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');

/**
 * Agent5 竞标对比：我方 + 单份对手 -> gaps（逐份各一次 run）。
 */
async function agent5(input) {
  const messages = [
    { role: 'system', content: prompts.bid_compare },
    { role: 'user', content: JSON.stringify({ our_doc: input.our_doc || {}, opponent_doc: input.opponent_doc || {} }) },
  ];
  const raw = await chat(messages, { agentName: 'bid_compare' });
  return schemas.validate('bid_compare', JSON.parse(raw));
}

module.exports = agent5;
