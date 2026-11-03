const { chat } = require('../llmProvider');
const prompts = require('../prompts');
const schemas = require('../schemas');

/**
 * Agent4 招标要求覆盖度：requirements + 我方 JSON -> coverage。
 */
async function agent4(input) {
  const messages = [
    { role: 'system', content: prompts.requirement_coverage },
    { role: 'user', content: JSON.stringify({ requirements: input.requirements || [], our_doc: input.our_doc || {} }) },
  ];
  const raw = await chat(messages, { agentName: 'requirement_coverage' });
  return schemas.validate('requirement_coverage', JSON.parse(raw));
}

module.exports = agent4;
