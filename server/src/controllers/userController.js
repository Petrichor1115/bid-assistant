const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { ok, fail } = require('../utils/response');

function toUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  return user;
}

async function list(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const { keyword, role } = req.query;
    const where = [];
    const params = [];
    if (keyword) {
      where.push('name LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (role) {
      where.push('role = ?');
      params.push(role);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params);
    const [rows] = await db.execute(
      `SELECT id, name, role, department, created_at, updated_at FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    ok(res, { list: rows, total, page, pageSize });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const { name, password, role, department } = req.body || {};
    if (!name || !password) return fail(res, 422, 422, '用户名和密码不能为空');
    const [exists] = await db.execute('SELECT id FROM users WHERE name = ?', [name]);
    if (exists[0]) return fail(res, 422, 422, '用户名已存在');

    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, 10);
    await db.execute(
      'INSERT INTO users (id, name, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
      [id, name, hash, role || 'bidder', department || null]
    );
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    ok(res, { user: toUser(rows[0]) });
  } catch (e) {
    next(e);
  }
}

async function get(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '用户不存在');
    ok(res, { user: toUser(rows[0]) });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '用户不存在');

    const { name, password, role, department } = req.body || {};
    const updates = [];
    const params = [];
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (password) {
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department);
    }
    if (updates.length) {
      updates.push('updated_at = ?');
      params.push(new Date());
      params.push(req.params.id);
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const [updated] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    ok(res, { user: toUser(updated[0]) });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) return fail(res, 422, 422, '不能删除自己');
    const [target] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
    if (!target[0]) return fail(res, 404, 404, '用户不存在');
    if (target[0].role === 'admin') {
      const [[{ cnt }]] = await db.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'");
      if (cnt <= 1) return fail(res, 422, 422, '不能删除最后一个管理员');
    }
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    ok(res, { message: 'ok' });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, create, get, update, remove };
