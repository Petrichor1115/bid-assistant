const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

/**
 * 提取 PDF 纯文本；空文本（扫描件）抛错。
 * 注：原 PRD 指定 pdf-parse，但 pdf-parse(内嵌 pdf.js v1.10.100) 存在同进程重复调用
 * 「首次有文本、后续返回空」的 bug，改用 pdfjs-dist@2.16.105（legacy）规避。
 */
async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  return extractPdfTextFromBuffer(data);
}

async function extractPdfTextFromBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const task = pdfjsLib.getDocument({ data, disableFontFace: true, verbosity: 0 });
  const doc = await task.promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n';
  }
  await doc.destroy();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('PDF 无文本（可能为扫描件）');
  return trimmed;
}

/**
 * 通用文本提取：根据文件名后缀分派 PDF / Word（.docx）。
 */
async function extractTextFromBuffer(buffer, originalName) {
  const ext = (originalName || '').toLowerCase().split('.').pop();
  if (ext === 'docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }
  // 默认走 PDF（含 .pdf）
  return extractPdfTextFromBuffer(buffer);
}

module.exports = { extractPdfText, extractPdfTextFromBuffer, extractTextFromBuffer };
