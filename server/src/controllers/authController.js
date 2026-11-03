const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { ok, fail } = require('../utils/response');

function toUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  return user;
}

async function login(req, res, next) {
  try {
    const { username, password, app } = req.body || {};
    if (!username || !password) {
      return fail(res, 401, 401, '用户名或密码错误');
    }
    const [rows] = await db.execute('SELECT * FROM users WHERE name = ?', [username]);
    const u = rows[0];
    if (!u || !bcrypt.compareSync(password, u.password_hash)) {
      return fail(res, 401, 401, '用户名或密码错误');
    }
    const need = app === 'admin' ? 'admin' : 'bidder';
    if (u.role !== need) {
      return fail(res, 401, 401, '账号与当前应用角色不匹配');
    }
    const token = jwt.sign({ id: u.id, name: u.name, role: u.role }, config.jwtSecret, { expiresIn: '7d' });
    ok(res, { token, user: toUser(u) });
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return fail(res, 404, 404, '用户不存在');
    ok(res, { user: toUser(rows[0]) });
  } catch (e) {
    next(e);
  }
}

function logout(req, res) {
  ok(res, { message: 'ok' });
}

module.exports = { login, me, logout };
