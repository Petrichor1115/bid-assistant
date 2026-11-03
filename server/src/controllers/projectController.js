const crypto = require('crypto');
const db = require('../db');
const { ok, fail } = require('../utils/response');

function toProject(row) {
  if (!row) return null;
  return {
    ...row,
    capacity_mwh: row.capacity_mwh != null ? Number(row.capacity_mwh) : null,
    power_mw: row.power_mw != null ? Number(row.power_mw) : null,
    duration_h: row.duration_h != null ? Number(row.duration_h) : null,
  };
}

async function list(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const { status, keyword, sort, storage_type, created_from, created_to } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (storage_type) {
      where.push('storage_type = ?');
      params.push(storage_type);
    }
    if (keyword) {
      where.push('(name LIKE ? OR bidder LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (created_from) {
      where.push('created_at >= ?');
      params.push(created_from);
    }
    if (created_to) {
      where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(created_to);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = sort === 'updated_at' ? 'ORDER BY updated_at DESC' : 'ORDER BY created_at DESC';
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM projects ${whereSql}`, params);
    const [rows] = await db.execute(
      `SELECT * FROM projects ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    ok(res, { list: rows.map(toProject), total, page, pageSize });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const { name, bidder, deadline, region, storage_type, description, capacity_mwh, power_mw, duration_h } = req.body || {};
    if (!name || !String(name).trim()) return fail(res, 422, 422, '项目名称不能为空');

    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO projects (id, name, bidder, deadline, region, storage_type, capacity_mwh, power_mw, duration_h, description, status, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [id, String(name).trim(), bidder || null, deadline || null, region || null, storage_type || null,
        capacity_mwh ?? null, power_mw ?? null, duration_h ?? null, description || null, req.user.id]
    );
    const [rows] = await db.execute('SELECT * FROM projects WHERE id = ?', [id]);
    ok(res, { project: toProject(rows[0]) });
  } catch (e) {
    next(e);
  }
}

async function get(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '项目不存在');
    const [files] = await db.execute('SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC', [req.params.id]);
    const [library] = await db.execute('SELECT id, library_name, entry_count, status FROM competitor_bid_libraries WHERE project_id = ?', [req.params.id]);
    ok(res, { project: toProject(rows[0]), files, library: library[0] || null });
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '项目不存在');
    if (rows[0].status === 'archived') return fail(res, 409, 409, '已归档项目不可编辑');

    const fields = ['name', 'bidder', 'deadline', 'region', 'storage_type', 'description', 'capacity_mwh', 'power_mw', 'duration_h'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }
    if (updates.length) {
      updates.push('updated_at = ?');
      params.push(new Date());
      params.push(req.params.id);
      await db.execute(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const [updated] = await db.execute('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    ok(res, { project: toProject(updated[0]) });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT id FROM projects WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '项目不存在');
    await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    ok(res, { message: 'ok' });
  } catch (e) {
    next(e);
  }
}

async function timeline(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT version_no, COUNT(*) AS file_count, MIN(created_at) AS created_at
       FROM files WHERE project_id = ? GROUP BY version_no ORDER BY version_no DESC`,
      [req.params.id]
    );
    const list = [];
    for (const r of rows) {
      const [runs] = await db.execute(
        'SELECT status FROM agent_runs WHERE project_id = ? AND version_no = ?',
        [req.params.id, r.version_no]
      );
      const statuses = runs.map((x) => x.status);
      const agent_status = statuses.length
        ? statuses.every((s) => s === 'success')
          ? 'success'
          : statuses.includes('failed')
            ? 'failed'
            : statuses.includes('running')
              ? 'running'
              : 'pending'
        : null;
      list.push({ version_no: r.version_no, file_count: r.file_count, agent_status, created_at: r.created_at });
    }
    ok(res, { list });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, create, get, update, remove, timeline };
