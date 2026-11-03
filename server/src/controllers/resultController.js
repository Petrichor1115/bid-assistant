const db = require('../db');
const reportGenerator = require('../services/report/reportGenerator');
const { ok, fail } = require('../utils/response');

const PARAM_FIELDS = ['battery_type', 'cycle_life', 'inverter_efficiency', 'system_efficiency', 'warranty_years', 'total_price_eur'];

function pickParams(doc) {
  const tp = doc?.technical_params || {};
  const params = {};
  for (const f of PARAM_FIELDS) {
    params[f] = f === 'total_price_eur' ? (doc?.pricing?.total_price_eur ?? null) : (tp[f] ?? null);
  }
  return params;
}

async function results(req, res, next) {
  try {
    const projectId = req.params.id;
    const [proj] = await db.execute('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!proj[0]) return fail(res, 404, 404, '项目不存在');

    let versionNo = req.query.version_no ? Number(req.query.version_no) : null;
    if (!versionNo) {
      const [[{ maxV }]] = await db.execute(
        "SELECT MAX(version_no) AS maxV FROM agent_runs WHERE project_id = ? AND status = 'success'",
        [projectId]
      );
      versionNo = maxV || null;
    }

    const empty = { version_no: null, opponents: [], self_check: [], coverage: [], bid_gaps: [], param_compare: { fields: PARAM_FIELDS, our: {}, opponents: [] } };
    if (!versionNo) return ok(res, empty);

    const [opponents] = await db.execute(
      `SELECT f.id AS file_id, e.company_name FROM files f
       LEFT JOIN competitor_bid_entries e ON e.file_id = f.id
       WHERE f.project_id = ? AND f.file_type = 'competitor_bid' ORDER BY f.created_at DESC`,
      [projectId]
    );
    const opponentFileId = req.query.opponent_file_id || (opponents[0]?.file_id || null);

    const [selfCheck] = await db.execute("SELECT * FROM issues WHERE project_id = ? AND version_no = ? AND category = 'self_check' ORDER BY created_at", [projectId, versionNo]);
    const [bidGaps] = await db.execute("SELECT * FROM issues WHERE project_id = ? AND version_no = ? AND category = 'bid_gap' ORDER BY created_at", [projectId, versionNo]);

    const [covRuns] = await db.execute(
      "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'requirement_coverage' AND status = 'success' ORDER BY finished_at DESC LIMIT 1",
      [projectId, versionNo]
    );
    const coverage = covRuns[0]?.output_json?.coverage || [];

    const [ourRuns] = await db.execute(
      "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success' AND JSON_EXTRACT(input_json, '$.doc_type') = 'our' ORDER BY finished_at DESC LIMIT 1",
      [projectId, versionNo]
    );
    const our = pickParams(ourRuns[0]?.output_json || {});

    const paramOpponents = [];
    for (const opp of opponents) {
      if (opponentFileId && opp.file_id !== opponentFileId) continue;
      const [oppRuns] = await db.execute(
        "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success' AND JSON_EXTRACT(input_json, '$.file_id') = ? ORDER BY finished_at DESC LIMIT 1",
        [projectId, versionNo, opp.file_id]
      );
      paramOpponents.push({ file_id: opp.file_id, company_name: opp.company_name, params: pickParams(oppRuns[0]?.output_json || {}) });
    }

    ok(res, { version_no: versionNo, opponents, self_check: selfCheck, coverage, bid_gaps: bidGaps, param_compare: { fields: PARAM_FIELDS, our, opponents: paramOpponents } });
  } catch (e) {
    next(e);
  }
}

async function listIssues(req, res, next) {
  try {
    const { category, severity, version_no } = req.query;
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const where = ['project_id = ?'];
    const params = [req.params.id];
    if (category) { where.push('category = ?'); params.push(category); }
    if (severity) { where.push('severity = ?'); params.push(severity); }
    if (version_no) { where.push('version_no = ?'); params.push(Number(version_no)); }
    const whereSql = where.join(' AND ');
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM issues WHERE ${whereSql}`, params);
    const [rows] = await db.execute(`SELECT * FROM issues WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    ok(res, { list: rows, total, page, pageSize });
  } catch (e) {
    next(e);
  }
}

async function updateIssue(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM issues WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '问题不存在');
    const isResolved = req.body?.is_resolved ? 1 : 0;
    await db.execute('UPDATE issues SET is_resolved = ? WHERE id = ?', [isResolved, req.params.id]);
    const [updated] = await db.execute('SELECT * FROM issues WHERE id = ?', [req.params.id]);
    ok(res, { issue: updated[0] });
  } catch (e) {
    next(e);
  }
}

async function resultsPdf(req, res, next) {
  try {
    const projectId = req.params.id;
    const [proj] = await db.execute('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (!proj[0]) return fail(res, 404, 404, '项目不存在');

    const [[{ maxV }]] = await db.execute(
      "SELECT MAX(version_no) AS maxV FROM agent_runs WHERE project_id = ? AND status = 'success'",
      [projectId]
    );
    const versionNo = req.query.version_no ? Number(req.query.version_no) : (maxV || 1);
    const [selfCheck] = await db.execute("SELECT * FROM issues WHERE project_id = ? AND category = 'self_check' AND version_no = ?", [projectId, versionNo]);
    const [gaps] = await db.execute("SELECT * FROM issues WHERE project_id = ? AND category = 'requirement_gap' AND version_no = ?", [projectId, versionNo]);
    const [bidGaps] = await db.execute("SELECT * FROM issues WHERE project_id = ? AND category = 'bid_gap' AND version_no = ?", [projectId, versionNo]);

    // 对比表格数据（我方 + 最新对手）
    const [ourRuns] = await db.execute(
      "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success' AND JSON_EXTRACT(input_json, '$.doc_type') = 'our' ORDER BY finished_at DESC LIMIT 1",
      [projectId, versionNo]
    );
    const ourParams = pickParams(ourRuns[0]?.output_json || {});
    const [oppFile] = await db.execute("SELECT id FROM files WHERE project_id = ? AND file_type = 'competitor_bid' ORDER BY created_at DESC LIMIT 1", [projectId]);
    let oppParams = {};
    if (oppFile[0]) {
      const [oppRuns] = await db.execute(
        "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success' AND JSON_EXTRACT(input_json, '$.file_id') = ? ORDER BY finished_at DESC LIMIT 1",
        [projectId, versionNo, oppFile[0].id]
      );
      oppParams = pickParams(oppRuns[0]?.output_json || {});
    }

    const pdf = await reportGenerator.generateResultsPdf({
      project: proj[0], selfCheck, gaps, bidGaps,
      compare: { fields: PARAM_FIELDS, our: ourParams, opponent: oppParams },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="review-results.pdf"');
    res.send(pdf);
  } catch (e) {
    next(e);
  }
}

module.exports = { results, listIssues, updateIssue, resultsPdf };
