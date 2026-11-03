const crypto = require('crypto');
const db = require('../../db');

function extractCompany(file) {
  const name = (file.original_name || file.storage_path || '').toLowerCase();
  if (name.includes('tesla')) return 'Tesla Energy';
  if (name.includes('沃太') || name.includes('沃泰')) return '沃太能源';
  const base = (file.original_name || '未知对手').replace(/\.pdf$/i, '');
  return base || '未知对手';
}

/**
 * 对手标书自动入库（A8）。
 * 建库检查 -> 元数据记录（轻量）-> 写 entry -> feature_vector 建立 -> indexed -> entry_count+1
 */
async function archiveCompetitorBid(projectId, file) {
  let [libRows] = await db.execute('SELECT * FROM competitor_bid_libraries WHERE project_id = ?', [projectId]);
  let lib = libRows[0];
  if (!lib) {
    const libId = crypto.randomUUID();
    const [proj] = await db.execute('SELECT name FROM projects WHERE id = ?', [projectId]);
    await db.execute(
      "INSERT INTO competitor_bid_libraries (id, project_id, library_name, entry_count, status) VALUES (?, ?, ?, 0, 'active')",
      [libId, projectId, proj[0] ? `${proj[0].name}对手标书库` : '对手标书库']
    );
    lib = { id: libId, entry_count: 0 };
  }

  const companyName = extractCompany(file);
  const [projRows] = await db.execute('SELECT storage_type, capacity_mwh, power_mw, duration_h FROM projects WHERE id = ?', [projectId]);
  const p = projRows[0] || {};
  const projectType = p.storage_type || null;
  const projectScale = p.capacity_mwh != null ? `${p.capacity_mwh}MWh` : null;
  const industryDomain = p.storage_type === 'commercial' ? '工商业储能' : p.storage_type === 'residential' ? '户用储能' : p.storage_type === 'utility' ? '大型储能' : '储能';
  const entryId = crypto.randomUUID();
  const featureVector = { project_type: projectType, industry_domain: industryDomain, project_scale: projectScale, company: companyName };

  await db.execute(
    `INSERT INTO competitor_bid_entries (id, library_id, project_id, file_id, company_name, industry_domain, project_scale, project_type, tech_params_json, feature_vector, index_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'indexing')`,
    [entryId, lib.id, projectId, file.id, companyName, industryDomain, projectScale, projectType, null, featureVector]
  );

  // 索引建立（简化：直接 indexed；失败不影响入库）
  try {
    await db.execute(
      "UPDATE competitor_bid_entries SET feature_vector = ?, index_status = 'indexed' WHERE id = ?",
      [JSON.stringify(featureVector), entryId]
    );
  } catch (e) {
    await db.execute("UPDATE competitor_bid_entries SET index_status = 'failed' WHERE id = ?", [entryId]);
  }

  await db.execute('UPDATE competitor_bid_libraries SET entry_count = entry_count + 1 WHERE id = ?', [lib.id]);

  const [entryRows] = await db.execute('SELECT * FROM competitor_bid_entries WHERE id = ?', [entryId]);
  return { library: { id: lib.id }, entry: entryRows[0] };
}

module.exports = { archiveCompetitorBid };
