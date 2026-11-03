const express = require('express');
const config = require('../config');
const { ok } = require('../utils/response');

const router = express.Router();

/**
 * GET /api/health —— 探活接口
 * 按当前环境返回 DB/LLM/存储 的运行模式。
 */
router.get('/health', (req, res) => {
  ok(res, {
    status: 'ok',
    db: 'mysql',
    llm: config.llm.mock || !config.llm.apiKey ? 'mock' : 'ready',
    storage: config.storage.driver === 'local' ? 'local' : 'cloud',
  });
});

module.exports = router;
