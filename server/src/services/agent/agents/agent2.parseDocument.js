const { chat } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');

/**
 * Agent2 文档解析：我方一份；对手逐份各一次 run（由 doc_type 区分）。
 */
async function agent2(input) {
  const mockVariant = input.doc_type === 'opponent' ? 'agent2_opponent.json' : 'agent2_our.json';
  const messages = [
    { role: 'system', content: prompts.parse_document },
    { role: 'user', content: input.file_text || '' },
  ];
  const raw = await chat(messages, { agentName: 'parse_document', mockVariant });
  return schemas.validate('parse_document', JSON.parse(raw));
}

module.exports = agent2;
