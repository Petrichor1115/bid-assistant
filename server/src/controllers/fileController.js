const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');
const config = require('../config');
const storageAdapter = require('../services/storage/storageAdapter');
const archiveService = require('../services/archive/archiveService');
const { extractTextFromBuffer } = require('../services/agent/pdfExtractor');
const { chat: llmChat, chatRaw: llmChatRaw } = require('../services/agent/llmProvider');
const reportGenerator = require('../services/report/reportGenerator');
const { ok, fail } = require('../utils/response');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const FILE_TYPES = ['announcement', 'our_bid', 'competitor_bid'];

// multer/busboy 用 latin1 解码文件名，中文会乱码；这里转回 UTF-8
function fixOriginalName(name) {
  if (!name) return name;
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

async function uploadFile(req, res, next) {
  try {
    const { file_type, version_no } = req.body || {};
    if (!req.file) return fail(res, 422, 422, '文件为空');
    if (!FILE_TYPES.includes(file_type)) return fail(res, 422, 422, '文件类型非法');
    const originalName = fixOriginalName(req.file.originalname);
    if (!/\.(pdf|doc|docx)$/i.test(originalName)) return fail(res, 422, 422, '仅支持 PDF 或 Word 文件');

    const projectId = req.params.id;
    const [proj] = await db.execute('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!proj[0]) return fail(res, 404, 404, '项目不存在');
    if (proj[0].status === 'archived') return fail(res, 409, 409, '已归档项目不可上传文件');

    if (file_type === 'competitor_bid') {
      const [[{ cnt }]] = await db.execute(
        "SELECT COUNT(*) AS cnt FROM files WHERE project_id = ? AND file_type = 'competitor_bid'",
        [projectId]
      );
      if (cnt >= 20) return fail(res, 422, 422, '对手标书最多 20 份');
    }

    const id = crypto.randomUUID();
    const destName = `${id}.pdf`;
    const saved = storageAdapter.save(req.file.buffer, destName);

    let finalVersionNo;
    if (file_type === 'competitor_bid') {
      finalVersionNo = version_no ? Number(version_no) : 1; // 仅作归档时点标记
    } else {
      // 版本由 our_bid 驱动；announcement 跟随当前 our_bid 版本（无则 1）
      const [[{ maxOur }]] = await db.execute(
        "SELECT MAX(version_no) AS maxOur FROM files WHERE project_id = ? AND file_type = 'our_bid'",
        [projectId]
      );
      if (version_no) {
        finalVersionNo = Number(version_no);
      } else if (file_type === 'our_bid') {
        finalVersionNo = (maxOur || 0) + 1;
      } else {
        finalVersionNo = maxOur || 1;
      }
    }

    await db.execute(
      `INSERT INTO files (id, project_id, version_no, file_type, original_name, storage_path, storage_url, file_size, uploader_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId, finalVersionNo, file_type, originalName, saved.path, saved.url, req.file.size, req.user.id]
    );

    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [id]);

    let archived = null;
    if (file_type === 'competitor_bid') {
      archived = await archiveService.archiveCompetitorBid(projectId, rows[0]);
    }

    ok(res, { file: rows[0], archived });
  } catch (e) {
    next(e);
  }
}

async function list(req, res, next) {
  try {
    const { version_no, file_type } = req.query;
    const where = ['project_id = ?'];
    const params = [req.params.id];
    if (version_no) {
      where.push('version_no = ?');
      params.push(Number(version_no));
    }
    if (file_type) {
      where.push('file_type = ?');
      params.push(file_type);
    }
    const [rows] = await db.execute(
      `SELECT * FROM files WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    ok(res, { list: rows });
  } catch (e) {
    next(e);
  }
}

async function download(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '文件不存在');
    const file = rows[0];
    const fullPath = path.join(config.storage.dir, file.storage_path || '');
    if (!fs.existsSync(fullPath)) return fail(res, 404, 404, '文件已丢失');
    res.download(fullPath, file.original_name || file.storage_path);
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!rows[0]) return fail(res, 404, 404, '文件不存在');
    const file = rows[0];

    if (file.file_type === 'competitor_bid') {
      const [lib] = await db.execute('SELECT id FROM competitor_bid_libraries WHERE project_id = ?', [file.project_id]);
      if (lib[0]) {
        await db.execute('UPDATE competitor_bid_libraries SET entry_count = GREATEST(entry_count - 1, 0) WHERE id = ?', [lib[0].id]);
      }
    }

    storageAdapter.remove(file.storage_path);
    await db.execute('DELETE FROM files WHERE id = ?', [req.params.id]);
    ok(res, { message: 'ok' });
  } catch (e) {
    next(e);
  }
}

async function diff(req, res, next) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return fail(res, 400, 400, '缺少 from/to 参数');
    const fromV = Number(from);
    const toV = Number(to);

    const readDoc = async (versionNo) => {
      const [runs] = await db.execute(
        `SELECT output_json FROM agent_runs
         WHERE project_id = ? AND version_no = ? AND agent_name = 'parse_document' AND status = 'success'
         ORDER BY finished_at DESC LIMIT 1`,
        [req.params.id, versionNo]
      );
      return runs[0]?.output_json || {};
    };

    const fromDoc = await readDoc(fromV);
    const toDoc = await readDoc(toV);

    const changes = [];
    const keys = new Set([...Object.keys(fromDoc), ...Object.keys(toDoc)]);
    for (const k of keys) {
      const a = fromDoc[k];
      const b = toDoc[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        const change_type = a === undefined || a === null ? 'added' : b === undefined || b === null ? 'removed' : 'modified';
        changes.push({ field: k, from_value: a, to_value: b, change_type });
      }
    }
    ok(res, { from: fromV, to: toV, changes, summary: `${changes.length} 处变化` });
  } catch (e) {
    next(e);
  }
}

function classifyFile(originalName, text) {
  const n = (originalName || '').toLowerCase();
  const head = (text || '').slice(0, 2000);

  // 1) 文件名语义优先（比正文更可靠）
  if (/(公告|招标|tender|announce|invitation)/.test(n)) return 'announcement';
  if (/(竞品|对手|竞争|competitor|tesla|opponent)/.test(n)) return 'competitor_bid';
  if (/(我方|投标|标书|our|bid)/.test(n)) return 'our_bid';

  // 2) 正文识别：招标公告用强特征，避免“招标编号”等标书正文中的弱词误判
  if (/(招标公告|招标方|招标人|tenderer|invitation)/i.test(head)) return 'announcement';
  if (/(tesla|competitor|opponent|竞品|对手)/i.test(head)) return 'competitor_bid';
  return 'our_bid';
}

function extractAmount(text) {
  if (!text) return '';
  // 优先 total / 总价 / 报价 / 金额
  let m = text.match(/(?:total\s*price|total|总价|报价|金额)[^\d]{0,12}(\d[\d,]*)/i);
  if (m) return m[1].replace(/,/g, '');
  // 兜底：大额数字 + 货币单位
  m = text.match(/(\d[\d,]{5,})\s*(?:EUR|USD|CNY|元|万|€|\$|¥)/i);
  if (m) return m[1].replace(/,/g, '');
  return '';
}

function extractDate(text) {
  if (!text) return '';
  const m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return '';
}

function extractByKeyword(text, keywords) {
  if (!text) return '';
  for (const kw of keywords) {
    const m = text.match(new RegExp(kw + '[\\s:：]*([^.,;\\n]{2,60})', 'i'));
    if (m) return m[1].trim();
  }
  return '';
}

/**
 * POST /api/files/identify —— 多文件自动识别类型 + AI 提取项目信息。
 */
async function identifyFiles(req, res, next) {
  try {
    const files = req.files || [];
    if (!files.length) return fail(res, 422, 422, '请上传文件');

    const identified = [];
    let announcementText = '';
    let ourBidText = '';
    let competitorText = '';
    for (const f of files) {
      let text = '';
      try {
        text = await extractTextFromBuffer(f.buffer, fixOriginalName(f.originalname));
      } catch {
        text = '';
      }
      const originalName = fixOriginalName(f.originalname);
      const type = classifyFile(originalName, text);
      identified.push({ original_name: originalName, file_type: type, size: f.size });
      if (type === 'announcement' && !announcementText) announcementText = text;
      if (type === 'our_bid' && !ourBidText) ourBidText = text;
      if (type === 'competitor_bid' && !competitorText) competitorText = text;
    }

    const project = { name: '', bidder: '', tender_amount: '', deadline: '', our_company: '', our_amount: '', competitor: '', competitor_amount: '' };

    // 公告：项目名称 / 招标方 / 招标金额 / 截止时间
    if (announcementText) {
      try {
        const raw = await llmChat(
          [
            { role: 'system', content: '从招标公告提取信息，只输出 JSON：{"name":"项目名称","bidder":"招标方","tender_amount":"招标金额(纯数字)","deadline":"截止日期YYYY-MM-DD"}' },
            { role: 'user', content: announcementText.slice(0, 3000) },
          ],
          { temperature: 0.2, maxTokens: 300 }
        );
        const p = JSON.parse(raw);
        project.name = p.name || '';
        project.bidder = p.bidder || p.tenderer || '';
        project.tender_amount = p.tender_amount ? String(p.tender_amount) : '';
        project.deadline = p.deadline || '';
      } catch {
        /* 忽略 */
      }
    }
    if (!project.name) {
      project.name = (identified[0]?.original_name || '').replace(/\.pdf$/i, '') || '未命名项目';
    }

    // 我方标书：投标方 + 投标金额
    if (ourBidText) {
      try {
        const raw = await llmChat(
          [
            { role: 'system', content: '从标书提取，只输出 JSON：{"company":"投标方公司名","total_price":"总报价(纯数字)"}' },
            { role: 'user', content: ourBidText.slice(0, 3000) },
          ],
          { temperature: 0.2, maxTokens: 200 }
        );
        const p = JSON.parse(raw);
        project.our_company = p.company || '';
        project.our_amount = p.total_price ? String(p.total_price) : '';
      } catch {
        /* 忽略 */
      }
    }

    // 竞品标书：竞标方 + 竞标金额
    if (competitorText) {
      try {
        const raw = await llmChat(
          [
            { role: 'system', content: '从竞品标书提取，只输出 JSON：{"company":"竞标方公司名","total_price":"总报价(纯数字)"}' },
            { role: 'user', content: competitorText.slice(0, 3000) },
          ],
          { temperature: 0.2, maxTokens: 200 }
        );
        const p = JSON.parse(raw);
        project.competitor = p.company || project.competitor || '';
        project.competitor_amount = p.total_price ? String(p.total_price) : '';
      } catch {
        /* 忽略 */
      }
    }

    // 金额/日期/公司名本地正则兜底（LLM 未提取到或 mock 模式时）
    if (!project.tender_amount) project.tender_amount = extractAmount(announcementText);
    if (!project.deadline) project.deadline = extractDate(announcementText);
    if (!project.our_amount) project.our_amount = extractAmount(ourBidText);
    if (!project.competitor_amount) project.competitor_amount = extractAmount(competitorText);
    if (!project.bidder) project.bidder = extractByKeyword(announcementText, ['Tenderer', '招标方', '招标人']);
    if (!project.our_company) project.our_company = extractByKeyword(ourBidText, ['Company', '投标方', '公司']);
    if (!project.competitor) project.competitor = extractByKeyword(competitorText, ['Company', '竞标方', '公司']);
    if (!project.name) {
      const m = announcementText.match(/^([\s\S]{5,80}?)\s*(?:Tenderer|招标方)/i);
      project.name = m ? m[1].trim() : '';
    }

    // 竞标方兜底（文件名）
    if (!project.competitor) {
      const comp = identified.find((i) => i.file_type === 'competitor_bid');
      if (comp) {
        const m = comp.original_name.match(/(tesla|bytedance|catl|samsung|lg|华为|比亚迪|宁德|特斯拉)/i);
        project.competitor = m ? m[0] : comp.original_name.replace(/\.pdf$/i, '');
      }
    }

    ok(res, { files: identified, project });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/projects/:id/modify-bid —— 一键修改：根据审查问题用 LLM 生成修改后我方标书，返回 PDF。
 */
async function modifyBid(req, res, next) {
  try {
    const projectId = req.params.id;
    const [ourFile] = await db.execute(
      "SELECT * FROM files WHERE project_id = ? AND file_type = 'our_bid' ORDER BY created_at DESC LIMIT 1",
      [projectId]
    );
    if (!ourFile[0]) return fail(res, 404, 404, '缺少我方标书');
    const fullPath = path.join(config.storage.dir, ourFile[0].storage_path || '');
    if (!fs.existsSync(fullPath)) return fail(res, 404, 404, '我方标书文件丢失');
    const ourText = await extractTextFromBuffer(fs.readFileSync(fullPath), ourFile[0].original_name);

    const [issues] = await db.execute('SELECT * FROM issues WHERE project_id = ?', [projectId]);
    const suggestions = issues.map((i) => `[${i.severity}] ${i.field_key || ''}：${i.suggestion || i.gap_description || ''}`).join('\n');

    const raw = await llmChatRaw(
      [
        { role: 'system', content: '你是储能标书撰写专家。根据我方标书和审查发现的问题，输出修改后的标书全文（中文），逐条改进所有问题。只输出标书正文，不要任何解释。' },
        { role: 'user', content: `我方标书：\n${ourText.slice(0, 3000)}\n\n审查发现的问题：\n${suggestions.slice(0, 2000)}\n\n请输出修改后的标书全文。` },
      ],
      { temperature: 0.3, maxTokens: 3000 }
    );

    const pdf = await reportGenerator.generateTextPdf(raw);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="modified-our-bid.pdf"');
    res.send(pdf);
  } catch (e) {
    next(e);
  }
}

module.exports = { upload, uploadFile, list, download, remove, diff, identifyFiles, modifyBid };
