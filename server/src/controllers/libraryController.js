const db = require('../db');
const orchestrator = require('../services/agent/orchestrator');
const matchService = require('../services/library/matchService');
const { ok, fail } = require('../utils/response');

async function getLibrary(req, res, next) {
  try {
    const [lib] = await db.execute('SELECT * FROM competitor_bid_libraries WHERE project_id = ?', [req.params.id]);
    const [entries] = await db.execute(
      'SELECT id, company_name, industry_domain, project_scale, project_type, index_status, file_id FROM competitor_bid_entries WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    ok(res, { library: lib[0] || null, entries });
  } catch (e) {
    next(e);
  }
}

async function match(req, res, next) {
  try {
    const versionNo = Number(req.body?.version_no || (await orchestrator.getLatestVersion(req.params.id)));
    const recommendations = await matchService.match(req.params.id, versionNo);
    ok(res, { recommendations });
  } catch (e) {
    next(e);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT r.id, r.source_entry_id, r.source_file_id, e.company_name, r.match_score, r.match_features_json, r.recommendation_reason, r.status
       FROM bid_recommendations r JOIN competitor_bid_entries e ON e.id = r.source_entry_id
       WHERE r.target_project_id = ? ORDER BY r.match_score DESC`,
      [req.params.id]
    );
    ok(res, { list: rows });
  } catch (e) {
    next(e);
  }
}

async function setStatus(req, res, next, status) {
  try {
    const [rows] = await db.execute('SELECT * FROM bid_recommendations WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '推荐记录不存在');
    await db.execute('UPDATE bid_recommendations SET status = ?, updated_at = ? WHERE id = ?', [status, new Date(), req.params.id]);
    const [updated] = await db.execute('SELECT * FROM bid_recommendations WHERE id = ?', [req.params.id]);
    ok(res, { recommendation: updated[0] });
  } catch (e) {
    next(e);
  }
}

function adopt(req, res, next) {
  return setStatus(req, res, next, 'adopted');
}

function dismiss(req, res, next) {
  return setStatus(req, res, next, 'dismissed');
}

module.exports = { getLibrary, match, getRecommendations, adopt, dismiss };
