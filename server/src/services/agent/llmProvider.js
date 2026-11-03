const config = require('../../config');

const MOCK_FILE_MAP = {
  parse_announcement: 'agent1.json',
  parse_document: 'agent2_our.json',
  quality_check: 'agent3.json',
  requirement_coverage: 'agent4.json',
  bid_compare: 'agent5.json',
  competitor_match: 'agent6.json',
};

function isMock() {
  return config.llm.mock || !config.llm.apiKey;
}

function extractJson(text) {
  if (!text) throw new Error('LLM 返回为空');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('LLM 返回无 JSON');
  return text.slice(start, end + 1);
}

async function callDeepseek(messages, { temperature, maxTokens } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
        body: JSON.stringify({
          model: config.llm.model,
          messages,
          temperature: temperature ?? 0.2,
          max_tokens: maxTokens ?? 2000,
        }),
        signal: AbortSignal.timeout(config.llm.timeoutMs),
      });
      if (!res.ok) throw new Error(`LLM 调用失败: HTTP ${res.status}`);
      const json = await res.json();
      return json.choices?.[0]?.message?.content || '';
    } catch (e) {
      lastErr = e;
      if (attempt === 1) throw e;
    }
  }
  throw lastErr || new Error('LLM 调用失败');
}

/**
 * 统一 LLM 调用入口：返回 JSON 字符串。
 */
async function chat(messages, { agentName, mockVariant, temperature, maxTokens } = {}) {
  if (isMock()) {
    const file = mockVariant || MOCK_FILE_MAP[agentName] || `${agentName}.json`;
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const data = require(`../../mock/${file}`);
    return JSON.stringify(data);
  }
  const content = await callDeepseek(messages, { temperature, maxTokens });
  const extracted = extractJson(content);
  JSON.parse(extracted); // 校验
  return extracted;
}

/**
 * 纯文本调用入口：返回 LLM 原始文本（不提取 JSON）。
 */
async function chatRaw(messages, { temperature, maxTokens } = {}) {
  if (isMock()) {
    return '（Mock 模式）我方标书修改说明：\n1. 循环寿命提升至 6000 次以上；\n2. 补充 VDE-AR-N 4105 认证；\n3. 逆变器效率提升至 97.5% 以上；\n4. 优化报价成本结构。';
  }
  return callDeepseek(messages, { temperature, maxTokens });
}

module.exports = { chat, chatRaw, isMock };
