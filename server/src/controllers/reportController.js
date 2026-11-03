const db = require('../db');
const reportGenerator = require('../services/report/reportGenerator');
const { ok, fail } = require('../utils/response');

async function archive(req, res, next) {
  try {
    const [proj] = await db.execute('SELECT status FROM projects WHERE id = ?', [req.params.id]);
    if (!proj[0]) return fail(res, 404, 404, '项目不存在');
    if (proj[0].status !== 'approved') return fail(res, 409, 409, '非 approved 状态不可归档');
    const report = await reportGenerator.generateReport(req.params.id);
    ok(res, { report });
  } catch (e) {
    next(e);
  }
}

async function getReport(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM project_reports WHERE project_id = ? ORDER BY generated_at DESC LIMIT 1', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '报告不存在');
    ok(res, { report: rows[0] });
  } catch (e) {
    next(e);
  }
}

async function getPdf(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM project_reports WHERE project_id = ? ORDER BY generated_at DESC LIMIT 1', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '报告不存在');
    const buffer = await reportGenerator.generatePdf(rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (e) {
    next(e);
  }
}

module.exports = { archive, getReport, getPdf };
