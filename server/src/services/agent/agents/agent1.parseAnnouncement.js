const { chat } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');

/**
 * Agent1 招标公告解析：公告文本 -> 硬性要求清单。
 */
async function agent1(input) {
  const messages = [
    { role: 'system', content: prompts.parse_announcement },
    { role: 'user', content: input.announcement_text || '' },
  ];
  const raw = await chat(messages, { agentName: 'parse_announcement' });
  return schemas.validate('parse_announcement', JSON.parse(raw));
}

module.exports = agent1;
