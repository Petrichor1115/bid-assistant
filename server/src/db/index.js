const mysql = require('mysql2/promise');
const config = require('../config');

/**
 * mysql2/promise 连接池单例（供所有业务代码复用）。
 */
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
});

module.exports = pool;
