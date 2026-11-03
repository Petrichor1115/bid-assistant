const db = require('../db');
const { ok } = require('../utils/response');

const PERIOD_DAYS = { week: 7, month: 30, quarter: 90 };

/**
 * GET /api/dashboard —— 用户仪表盘
 * 返回状态卡片、最近 4 周审查次数、问题分类统计（按周期）。
 */
async function dashboard(req, res, next) {
  try {
    const statuses = ['draft', 'in_progress', 'awaiting_approval', 'archived'];
    const statusCards = {};
    for (const s of statuses) {
      const [[{ c }]] = await db.execute('SELECT COUNT(*) AS c FROM projects WHERE status = ?', [s]);
      statusCards[s] = c;
    }

    // 最近 4 周审查次数（agent_runs）
    const [runs] = await db.execute(
      'SELECT started_at FROM agent_runs WHERE started_at IS NOT NULL AND started_at >= DATE_SUB(NOW(), INTERVAL 28 DAY)'
    );
    const weeklyReviews = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 3; i >= 0; i--) {
      const start = new Date(today);
      start.setDate(start.getDate() - (i * 7 + today.getDay()));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = runs.filter((r) => {
        const d = new Date(r.started_at);
        return d >= start && d < end;
      }).length;
      weeklyReviews.push({ week: `${start.getMonth() + 1}/${start.getDate()}`, count });
    }

    // 问题分类统计（按具体问题 field，周期可切）
    const period = req.query.period || 'month';
    const days = PERIOD_DAYS[period] || 30;
    const [issues] = await db.execute(
      `SELECT COALESCE(field_label, field_key, category) AS name, COUNT(*) AS count
       FROM issues WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY COALESCE(field_label, field_key, category)
       ORDER BY count DESC LIMIT 10`,
      [days]
    );

    ok(res, { status_cards: statusCards, weekly_reviews: weeklyReviews, issue_stats: issues });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/dashboard —— 管理端仪表盘
 */
async function adminDashboard(req, res, next) {
  try {
    const [[{ projectTotal }]] = await db.execute('SELECT COUNT(*) AS projectTotal FROM projects');
    const [[{ agentRunTotal }]] = await db.execute('SELECT COUNT(*) AS agentRunTotal FROM agent_runs');
    const [[{ successCount }]] = await db.execute("SELECT COUNT(*) AS successCount FROM agent_runs WHERE status = 'success'");
    const [[{ storageBytes }]] = await db.execute('SELECT COALESCE(SUM(file_size), 0) AS storageBytes FROM files');
    const rate = agentRunTotal ? Math.round((successCount / agentRunTotal) * 100) : 0;

    ok(res, {
      project_total: projectTotal,
      agent_run_total: agentRunTotal,
      agent_success_rate: rate,
      storage_used_bytes: storageBytes,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/files —— 全部文件（含项目名）。
 */
async function adminFiles(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT f.*, p.name AS project_name FROM files f LEFT JOIN projects p ON p.id = f.project_id ORDER BY f.created_at DESC'
    );
    ok(res, { list: rows });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/admin/approvals —— 全部审核记录（含项目名）。
 */
async function adminApprovals(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT a.*, p.name AS project_name FROM approvals a LEFT JOIN projects p ON p.id = a.project_id ORDER BY a.created_at DESC'
    );
    ok(res, { list: rows });
  } catch (e) {
    next(e);
  }
}

module.exports = { dashboard, adminDashboard, adminFiles, adminApprovals };
