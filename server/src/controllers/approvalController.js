const crypto = require('crypto');
const db = require('../db');
const orchestrator = require('../services/agent/orchestrator');
const { ok, fail } = require('../utils/response');

const MAIN_AGENTS = ['parse_announcement', 'parse_document', 'quality_check', 'requirement_coverage', 'bid_compare'];

async function submitApproval(req, res, next) {
  try {
    const projectId = req.params.id;
    const [proj] = await db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!proj[0]) return fail(res, 404, 404, '项目不存在');
    if (!['draft', 'in_progress'].includes(proj[0].status)) return fail(res, 409, 409, '当前状态不可提交审批');

    const versionNo = Number(req.body?.version_no || (await orchestrator.getLatestVersion(projectId)));

    const [runs] = await db.execute(
      `SELECT DISTINCT agent_name, status FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name IN (?, ?, ?, ?, ?)`,
      [projectId, versionNo, ...MAIN_AGENTS]
    );
    const successSet = new Set(runs.filter((r) => r.status === 'success').map((r) => r.agent_name));
    const missing = MAIN_AGENTS.filter((name) => !successSet.has(name));
    if (missing.length) return fail(res, 422, 422, '未完成 AI 分析，无法提交审批');

    const levels = ['tech_lead', 'legal', 'bid_director'];
    const approvals = [];
    for (const level of levels) {
      const id = crypto.randomUUID();
      await db.execute(
        "INSERT INTO approvals (id, project_id, version_no, level, decision, auto_approved) VALUES (?, ?, ?, ?, 'approved', 1)",
        [id, projectId, versionNo, level]
      );
      const [a] = await db.execute('SELECT * FROM approvals WHERE id = ?', [id]);
      approvals.push(a[0]);
    }
    await db.execute("UPDATE projects SET status = 'approved', updated_at = ? WHERE id = ?", [new Date(), projectId]);

    ok(res, { approvals, project_status: 'approved' });
  } catch (e) {
    next(e);
  }
}

async function listApprovals(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at', [req.params.id]);
    ok(res, { list: rows });
  } catch (e) {
    next(e);
  }
}

module.exports = { submitApproval, listApprovals };
