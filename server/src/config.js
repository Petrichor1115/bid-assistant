const path = require('path');
const dotenv = require('dotenv');

// 读取 .env（默认在 server/ 目录下运行，故用相对当前工作目录）
dotenv.config();

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === '1';
}

const config = {
  // 服务
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

  // 数据库（MySQL）
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123456',
    name: process.env.DB_NAME || 'bid_demo',
  },
  cloudDbUrl: process.env.CLOUD_DB_URL || '',

  // 文件存储
  storage: {
    dir: path.resolve(process.env.STORAGE_DIR || './storage/uploads'),
    driver: process.env.STORAGE_DRIVER || 'local',
  },

  // 云端对象存储（s3/oss/minio，未配置则禁用同步）
  cloudStorage: {
    driver: process.env.CLOUD_STORAGE_DRIVER || '',
    endpoint: process.env.CLOUD_ENDPOINT || '',
    bucket: process.env.CLOUD_BUCKET || '',
    accessKey: process.env.CLOUD_ACCESS_KEY || '',
    secretKey: process.env.CLOUD_SECRET_KEY || '',
  },

  // LLM
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
    model: process.env.LLM_MODEL || 'deepseek-chat',
    mock: toBool(process.env.LLM_MOCK, true),
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 30000),
  },
};

module.exports = config;
