const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../../db');
const config = require('../../config');
const pdfExtractor = require('./pdfExtractor');
const schemas = require('./schemas');
const agent1 = require('./agents/agent1.parseAnnouncement');
const agent2 = require('./agents/agent2.parseDocument');
const agent3 = require('./agents/agent3.qualityCheck');
const agent4 = require('./agents/agent4.requirementCoverage');
const agent5 = require('./agents/agent5.bidCompare');

const AGENTS = {
  parse_announcement: agent1,
  parse_document: agent2,
  quality_check: agent3,
  requirement_coverage: agent4,
  bid_compare: agent5,
};

const MAIN = ['parse_announcement', 'parse_document', 'quality_check', 'requirement_coverage', 'bid_compare'];
const ISSUE_CATEGORY = { quality_check: 'self_check', requirement_coverage: 'requirement_gap', bid_compare: 'bid_gap' };

async function createRun(name, projectId, versionNo) {
  const id = crypto.randomUUID();
  await db.execute(
    'INSERT INTO agent_runs (id, project_id, version_no, agent_name, status) VALUES (?, ?, ?, ?, ?)',
    [id, projectId, versionNo, name, 'pending']
  );
  return id;
}

async function updateRun(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  await db.execute(`UPDATE agent_runs SET ${sets} WHERE id = ?`, [...keys.map((k) => fields[k]), id]);
}

async function getRun(id) {
  const [rows] = await db.execute('SELECT * FROM agent_runs WHERE id = ?', [id]);
  return rows[0] || null;
}

async function persistIssues(agentName, projectId, versionNo, output) {
  const category = ISSUE_CATEGORY[agentName];
  if (!category) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM issues WHERE project_id = ? AND version_no = ? AND source_agent = ?', [projectId, versionNo, agentName]);

    if (agentName === 'quality_check') {
      for (const iss of output.issues || []) {
        await conn.execute(
          'INSERT INTO issues (id, project_id, version_no, category, severity, field_key, field_label, our_value, suggestion, source_agent, is_resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [crypto.randomUUID(), projectId, versionNo, category, iss.severity ?? null, iss.field ?? null, iss.field ?? null, iss.current_value != null ? String(iss.current_value) : null, iss.suggestion ?? null, agentName]
        );
      }
    } else if (agentName === 'requirement_coverage') {
      for (const c of output.coverage || []) {
        if (c.our_status === 'covered') continue;
        const severity = c.our_status === 'missing' ? 'red' : 'yellow';
        await conn.execute(
          'INSERT INTO issues (id, project_id, version_no, category, severity, field_key, field_label, our_value, suggestion, source_agent, is_resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [crypto.randomUUID(), projectId, versionNo, category, severity, c.req_item ?? null, c.req_item ?? null, c.evidence || null, null, agentName]
        );
      }
    } else if (agentName === 'bid_compare') {
      for (const g of output.gaps || []) {
        await conn.execute(
          'INSERT INTO issues (id, project_id, version_no, category, severity, field_key, field_label, our_value, opponent_value, gap_description, suggestion, source_agent, is_resolved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [crypto.randomUUID(), projectId, versionNo, category, g.severity ?? null, g.field ?? null, g.field ?? null, g.our_value != null ? String(g.our_value) : null, g.opponent_value != null ? String(g.opponent_value) : null, g.gap_description ?? null, g.suggestion ?? null, agentName]
        );
      }
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function runAgent(name, projectId, versionNo, input) {
  const runId = await createRun(name, projectId, versionNo);
  const started = Date.now();
  let lastErr = new Error('未知错误');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await updateRun(runId, { status: 'running', started_at: new Date() });
      await updateRun(runId, { input_json: JSON.stringify(input) });
      const output = await AGENTS[name](input);
      schemas.validate(name, output);
      await updateRun(runId, { status: 'success', output_json: JSON.stringify(output), finished_at: new Date(), duration_ms: Date.now() - started });
      await persistIssues(name, projectId, versionNo, output);
      return getRun(runId);
    } catch (e) {
      lastErr = e;
      if (attempt < 3) continue;
      break;
    }
  }
  await updateRun(runId, { status: 'failed', error_message: lastErr.message, finished_at: new Date() });
  return getRun(runId);
}

async function getLatestVersion(projectId) {
  const [[{ maxV }]] = await db.execute(
    "SELECT MAX(version_no) AS maxV FROM files WHERE project_id = ? AND file_type IN ('announcement','our_bid')",
    [projectId]
  );
  return maxV || 1;
}

async function getFile(projectId, versionNo, fileType) {
  const [rows] = await db.execute(
    'SELECT * FROM files WHERE project_id = ? AND file_type = ? AND version_no = ? ORDER BY created_at DESC LIMIT 1',
    [projectId, fileType, versionNo]
  );
  return rows[0] || null;
}

async function extractFileText(file) {
  const fullPath = path.join(config.storage.dir, file.storage_path || '');
  if (!fs.existsSync(fullPath)) throw new Error(`文件不存在: ${file.original_name}`);
  const buffer = fs.readFileSync(fullPath);
  return pdfExtractor.extractTextFromBuffer(buffer, file.original_name);
}

async function getOpponentFiles(projectId) {
  const [rows] = await db.execute(
    "SELECT * FROM files WHERE project_id = ? AND file_type = 'competitor_bid' ORDER BY created_at DESC",
    [projectId]
  );
  return rows;
}

async function runAll(projectId, versionNo) {
  const runs = [];

  // Agent1 公告
  const ann = await getFile(projectId, versionNo, 'announcement');
  if (ann) {
    try {
      const text = await extractFileText(ann);
      runs.push(await runAgent('parse_announcement', projectId, versionNo, { announcement_text: text }));
    } catch (e) {
      console.error('公告提取失败:', e.message);
    }
  }

  // Agent2 我方 + 对手逐份
  let ourDoc = null;
  const ourFile = await getFile(projectId, versionNo, 'our_bid');
  if (ourFile) {
    try {
      const text = await extractFileText(ourFile);
      const run = await runAgent('parse_document', projectId, versionNo, { doc_type: 'our', file_text: text, file_id: ourFile.id });
      runs.push(run);
      if (run.status === 'success') ourDoc = run.output_json;
    } catch (e) {
      console.error('我方标书提取失败:', e.message);
    }
  }

  const opponentDocs = [];
  for (const f of await getOpponentFiles(projectId)) {
    try {
      const text = await extractFileText(f);
      const run = await runAgent('parse_document', projectId, versionNo, { doc_type: 'opponent', file_text: text, file_id: f.id });
      runs.push(run);
      if (run.status === 'success') opponentDocs.push({ file: f, doc: run.output_json });
    } catch (e) {
      console.error('对手标书提取失败:', e.message);
    }
  }

  // Agent3 自审
  if (ourDoc) {
    runs.push(await runAgent('quality_check', projectId, versionNo, { our_doc: ourDoc }));
  }

  // Agent4 覆盖
  const annRun = runs.find((r) => r.agent_name === 'parse_announcement' && r.status === 'success');
  if (annRun && ourDoc) {
    runs.push(await runAgent('requirement_coverage', projectId, versionNo, { requirements: (annRun.output_json && annRun.output_json.requirements) || [], our_doc: ourDoc }));
  }

  // Agent5 逐份对比
  for (const od of opponentDocs) {
    runs.push(await runAgent('bid_compare', projectId, versionNo, { our_doc: ourDoc, opponent_doc: od.doc }));
  }

  return runs;
}

async function runSingle(name, projectId, versionNo) {
  if (!AGENTS[name]) throw new Error(`未知 Agent: ${name}`);

  if (name === 'parse_announcement') {
    const ann = await getFile(projectId, versionNo, 'announcement');
    if (!ann) throw new Error('缺少招标公告文件');
    const text = await extractFileText(ann);
    return runAgent(name, projectId, versionNo, { announcement_text: text });
  }
  if (name === 'parse_document') {
    const ourFile = await getFile(projectId, versionNo, 'our_bid');
    if (!ourFile) throw new Error('缺少我方标书文件');
    const text = await extractFileText(ourFile);
    return runAgent(name, projectId, versionNo, { doc_type: 'our', file_text: text, file_id: ourFile.id });
  }

  // 下游 agent：读取上游最近 success 输出
  const latestOur = await latestOutput(projectId, versionNo, 'parse_document', 'our');
  if (name === 'quality_check') return runAgent(name, projectId, versionNo, { our_doc: latestOur || {} });
  if (name === 'requirement_coverage') {
    const annOut = await latestOutput(projectId, versionNo, 'parse_announcement');
    return runAgent(name, projectId, versionNo, { requirements: (annOut && annOut.requirements) || [], our_doc: latestOur || {} });
  }
  if (name === 'bid_compare') {
    const opponents = await getOpponentFiles(projectId);
    if (!opponents.length) throw new Error('无对手标书');
    const text = await extractFileText(opponents[0]);
    const oppRun = await runAgent('parse_document', projectId, versionNo, { doc_type: 'opponent', file_text: text, file_id: opponents[0].id });
    return runAgent(name, projectId, versionNo, { our_doc: latestOur || {}, opponent_doc: oppRun.output_json || {} });
  }
  throw new Error(`不支持的 Agent: ${name}`);
}

async function latestOutput(projectId, versionNo, agentName, docType) {
  const sql = docType
    ? "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = ? AND status = 'success' AND JSON_EXTRACT(input_json, '$.doc_type') = ? ORDER BY finished_at DESC LIMIT 1"
    : "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = ? AND status = 'success' ORDER BY finished_at DESC LIMIT 1";
  const params = docType ? [projectId, versionNo, agentName, docType] : [projectId, versionNo, agentName];
  const [rows] = await db.execute(sql, params);
  return rows[0] ? rows[0].output_json : null;
}

async function listRuns(projectId, versionNo) {
  const where = versionNo ? 'project_id = ? AND version_no = ?' : 'project_id = ?';
  const params = versionNo ? [projectId, versionNo] : [projectId];
  const [rows] = await db.execute(
    `SELECT id, project_id, version_no, agent_name, status, error_message, started_at, finished_at, duration_ms FROM agent_runs WHERE ${where} ORDER BY started_at DESC`,
    params
  );
  return rows;
}

async function retry(runId) {
  const run = await getRun(runId);
  if (!run) throw new Error('运行记录不存在');
  const name = run.agent_name;
  const projectId = run.project_id;
  const versionNo = run.version_no;
  const input = run.input_json || {};
  return runAgent(name, projectId, versionNo, input);
}

// 服务重启兜底：running -> failed
async function recoverInterruptedRuns() {
  await db.execute(
    "UPDATE agent_runs SET status = 'failed', error_message = '服务重启中断，请重试' WHERE status = 'running'"
  );
}

module.exports = { MAIN, runAll, runSingle, listRuns, getRun, retry, getLatestVersion, recoverInterruptedRuns };
