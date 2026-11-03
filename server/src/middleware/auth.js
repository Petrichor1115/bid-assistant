const jwt = require('jsonwebtoken');
const config = require('../config');
const { fail } = require('../utils/response');

/**
 * 鉴权中间件：解析 Authorization: Bearer <token>，校验通过后注入 req.user。
 */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    fail(res, 401, 401, '未登录或 token 无效');
  }
}

/**
 * 角色守卫：仅允许指定角色访问。
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      fail(res, 403, 403, '无权限');
    }
  };
}

module.exports = { auth, requireRole };
