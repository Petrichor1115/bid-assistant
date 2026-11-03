const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const db = require('../../db');

// 中文字体（黑体），用于 PDF 中文渲染
const FONT_PATH = 'C:/Windows/Fonts/simhei.ttf';

function useChineseFont(doc) {
  try {
    doc.registerFont('zh', FONT_PATH);
    doc.font('zh');
  } catch {
    // 字体不存在时回退默认字体
  }
}

/**
 * 归档统计 + 生成 project_reports。
 */
async function generateReport(projectId) {
  const [proj] = await db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!proj[0]) throw new Error('项目不存在');

  const [[{ totalVersions }]] = await db.execute(
    "SELECT COUNT(DISTINCT version_no) AS totalVersions FROM files WHERE project_id = ? AND file_type IN ('announcement','our_bid')",
    [projectId]
  );
  const [[{ totalDuration }]] = await db.execute(
    "SELECT COALESCE(SUM(duration_ms), 0) AS totalDuration FROM agent_runs WHERE project_id = ? AND status = 'success'",
    [projectId]
  );
  const [[{ selfCount }]] = await db.execute("SELECT COUNT(*) AS selfCount FROM issues WHERE project_id = ? AND category = 'self_check'", [projectId]);
  const [[{ gapCount }]] = await db.execute("SELECT COUNT(*) AS gapCount FROM issues WHERE project_id = ? AND category = 'requirement_gap'", [projectId]);
  const [[{ bidCount }]] = await db.execute("SELECT COUNT(*) AS bidCount FROM issues WHERE project_id = ? AND category = 'bid_gap'", [projectId]);
  const [[{ fatalCount }]] = await db.execute("SELECT COUNT(*) AS fatalCount FROM issues WHERE project_id = ? AND severity = 'red'", [projectId]);

  const [versions] = await db.execute(
    "SELECT version_no, COUNT(*) AS file_count FROM files WHERE project_id = ? AND file_type IN ('announcement','our_bid') GROUP BY version_no ORDER BY version_no",
    [projectId]
  );
  const versionHistory = versions.map((v) => ({ version_no: v.version_no, file_count: v.file_count }));
  const issueStats = { self_check: selfCount, requirement_gap: gapCount, bid_gap: bidCount };

  const totalHours = (totalDuration / 3600000).toFixed(2);
  const finalSummary = `项目共迭代 ${totalVersions} 版，累计耗时 ${totalHours} 小时；自审 ${selfCount} 项、招标差距 ${gapCount} 项、竞标差距 ${bidCount} 项，其中致命 ${fatalCount} 项。`;

  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO project_reports (id, project_id, total_versions, total_duration_hours, self_check_issue_count, requirement_gap_count, bid_gap_count, version_history_json, issue_statistics_json, final_summary, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, projectId, totalVersions, totalHours, selfCount, gapCount, bidCount, JSON.stringify(versionHistory), JSON.stringify(issueStats), finalSummary, new Date()]
  );

  await db.execute("UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?", [new Date(), projectId]);

  const [rows] = await db.execute('SELECT * FROM project_reports WHERE id = ?', [id]);
  return rows[0];
}

/**
 * 用 pdfkit 生成报告 PDF（中文）。
 */
function generatePdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    useChineseFont(doc);
    doc.fontSize(18).text('项目审查报告', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`项目 ID：${report.project_id}`);
    doc.text(`总版本数：${report.total_versions}`);
    doc.text(`累计耗时（小时）：${report.total_duration_hours}`);
    doc.text(`自审问题：${report.self_check_issue_count}`);
    doc.text(`招标差距：${report.requirement_gap_count}`);
    doc.text(`竞标差距：${report.bid_gap_count}`);
    doc.moveDown();
    doc.text(`摘要：${report.final_summary || '投标审查流程已完成。'}`);
    doc.end();
  });
}

/**
 * 生成审查结果 PDF（中文）。
 */
function generateResultsPdf(data) {
  const { project, selfCheck, gaps, bidGaps, compare } = data;
  const hasRed = [...selfCheck, ...gaps, ...bidGaps].some((i) => i.severity === 'red');
  const verdict = hasRed ? '不通过' : '通过';
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    useChineseFont(doc);
    doc.fontSize(18).text('投标审查结果报告', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`项目名称：${project?.name || '-'}`);
    doc.text(`审查结论：${verdict}`);
    doc.moveDown();

    doc.fontSize(14).text('审查汇总');
    doc.fontSize(11);
    doc.text(`自审问题：${selfCheck.length} 项`);
    doc.text(`招标差距：${gaps.length} 项`);
    doc.text(`竞标差距：${bidGaps.length} 项`);
    doc.moveDown();

    doc.fontSize(14).text('自审问题');
    doc.fontSize(10);
    for (const i of selfCheck) {
      doc.text(`[${i.severity}] ${i.field_key || ''} - ${i.suggestion || i.gap_description || ''}`);
    }
    doc.moveDown();

    doc.fontSize(14).text('招标差距');
    doc.fontSize(10);
    for (const g of gaps) {
      doc.text(`[${g.severity}] ${g.field_key || ''} - ${g.gap_description || g.suggestion || ''}`);
    }
    doc.moveDown();

    doc.fontSize(14).text('竞标差距');
    doc.fontSize(10);
    for (const b of bidGaps) {
      doc.text(`[${b.severity}] ${b.field_key || ''} - ${b.gap_description || b.suggestion || ''}`);
    }
    doc.moveDown();

    // 对比表格
    if (compare && compare.fields && compare.fields.length) {
      doc.fontSize(14).text('对比表格');
      doc.fontSize(10);
      doc.text('参数名            | 我方参数       | 竞标参数');
      for (const f of compare.fields) {
        doc.text(`${f}  |  ${compare.our?.[f] ?? '-'}  |  ${compare.opponent?.[f] ?? '-'}`);
      }
    }
    doc.end();
  });
}

/**
 * 将文本生成中文 PDF。
 */
function generateTextPdf(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    useChineseFont(doc);
    doc.fontSize(12);
    for (const line of String(text || '').split('\n')) {
      doc.text(line || ' ');
    }
    doc.end();
  });
}

module.exports = { generateReport, generatePdf, generateResultsPdf, generateTextPdf };
