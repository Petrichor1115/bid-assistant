const crypto = require('crypto');
const db = require('../../db');
const rules = require('../agent/rules');

function num(str) {
  const m = String(str || '').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function scaleSimilarity(a, b) {
  const na = num(a);
  const nb = num(b);
  if (na == null || nb == null) return 0;
  const max = Math.max(na, nb);
  if (max === 0) return 0;
  return Math.max(0, 1 - Math.abs(na - nb) / max);
}

function techSimilarity(current, entryTech) {
  if (!current || !entryTech || typeof entryTech !== 'object') return 0;
  const keys = ['capacity_mwh', 'power_mw', 'cycle_life', 'inverter_efficiency'];
  let s = 0;
  let w = 0;
  for (const k of keys) {
    const a = current[k];
    const b = entryTech[k];
    if (a != null && b != null) {
      w += 1;
      s += Math.max(0, 1 - Math.abs(Number(a) - Number(b)) / Math.max(Number(a), Number(b), 1));
    }
  }
  return w > 0 ? s / w : 0;
}

function matchScore(current, entry) {
  const w = rules.MATCH_WEIGHTS;
  let s = 0;
  let total = 0;

  if (current.project_type) {
    total += w.project_type;
    if (current.project_type === entry.project_type) s += w.project_type;
  }
  if (current.industry_domain) {
    total += w.industry_domain;
    if (current.industry_domain === entry.industry_domain) s += w.industry_domain;
  }
  if (current.project_scale) {
    total += w.project_scale;
    s += scaleSimilarity(current.project_scale, entry.project_scale) * w.project_scale;
  }
  if (current.technical_params && Object.keys(current.technical_params).length) {
    total += w.technical_params;
    s += techSimilarity(current.technical_params, entry.tech_params_json) * w.technical_params;
  }
  return total > 0 ? s / total : 0;
}

function buildReason(current, entry) {
  const parts = [];
  if (current.project_type && current.project_type === entry.project_type) parts.push('同属' + current.project_type + '储能');
  if (entry.project_scale) parts.push('规模 ' + entry.project_scale);
  parts.push('技术参数高度重合');
  return parts.join('、') + '，适合作为对标对象';
}

async function getProjectFeatures(projectId, versionNo) {
  const [proj] = await db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!proj[0]) throw new Error('项目不存在');
  const p = proj[0];

  let technical_params = null;
  const [runs] = await db.execute(
    "SELECT output_json FROM agent_runs WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success' AND JSON_EXTRACT(input_json, '$.doc_type') = 'our' ORDER BY finished_at DESC LIMIT 1",
    [projectId, versionNo]
  );
  if (runs[0] && runs[0].output_json && runs[0].output_json.technical_params) {
    technical_params = runs[0].output_json.technical_params;
  }

  return {
    project_type: p.storage_type || null,
    industry_domain: null,
    project_scale: p.capacity_mwh != null ? `${p.capacity_mwh}MWh` : null,
    technical_params,
  };
}

async function match(projectId, versionNo) {
  const current = await getProjectFeatures(projectId, versionNo);
  const [entries] = await db.execute(
    "SELECT * FROM competitor_bid_entries WHERE project_id = ? AND index_status = 'indexed'",
    [projectId]
  );

  const scored = entries
    .map((entry) => ({ entry, score: matchScore(current, entry) }))
    .filter((x) => x.score >= rules.MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, rules.MATCH_TOP_N);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM bid_recommendations WHERE target_project_id = ? AND status = 'recommended'", [projectId]);
    const recs = [];
    for (const { entry, score } of scored) {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO bid_recommendations (id, target_project_id, source_entry_id, source_file_id, match_score, match_features_json, recommendation_reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'recommended')`,
        [id, projectId, entry.id, entry.file_id, score, JSON.stringify({ project_type: current.project_type, industry_domain: entry.industry_domain, project_scale: entry.project_scale }), buildReason(current, entry)]
      );
      const [recRows] = await conn.execute(
        `SELECT r.*, e.company_name FROM bid_recommendations r JOIN competitor_bid_entries e ON e.id = r.source_entry_id WHERE r.id = ?`,
        [id]
      );
      recs.push(recRows[0]);
    }
    await conn.commit();
    return recs;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { match };
