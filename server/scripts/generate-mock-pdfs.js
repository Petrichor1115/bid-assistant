const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'src', 'mock', 'pdfs');
fs.mkdirSync(outDir, { recursive: true });

function escapePdfString(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * 手写最小 PDF（PDF 1.4，无压缩，精确 XRef）。
 * 文本按 70 字符换行（避免单行超页宽导致 pdfjs 截断）。
 */
function buildPdf(title, paragraphs) {
  const fullText = [title, ...paragraphs].join(' ');
  const words = fullText.split(' ');
  const chunks = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 70) {
      chunks.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line.trim()) chunks.push(line.trim());

  let content = 'BT /F1 10 Tf 40 760 Td 13 TL\n';
  for (const chunk of chunks) {
    content += `(${escapePdfString(chunk)}) Tj T*\n`;
  }
  content += 'ET';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    const num = i + 1;
    offsets[num] = Buffer.byteLength(pdf, 'utf8');
    const body = num === 4
      ? `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
      : objects[i];
    pdf += `${num} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

const docs = {
  'announcement.pdf': buildPdf('50MWh Commercial Energy Storage Tender Announcement', [
    'Tenderer: EnBW Energy Solutions GmbH. Project located in Bavaria, Germany. Storage type: commercial.',
    'Technical requirements: battery type must be LFP; system capacity >= 50MWh; cycle life >= 6000 cycles (80% DoD); inverter efficiency >= 97.5%.',
    'Certifications: IEC 62619 battery safety; CE marking; VDE-AR-N 4105 grid connection.',
    'Commercial terms: warranty >= 10 years. Tender amount: 15000000 EUR. Bid deadline: 2026-12-15.',
  ]),
  'our_bid.pdf': buildPdf('50MWh Commercial Storage Bid', [
    'Battery type LFP, rated capacity 50000 kWh, rated power 25000 kW, duration 2 hours.',
    'Cycle life 5500 cycles, inverter efficiency 97.0%, system efficiency 89.5%, energy density 245 Wh/L, DoD 95%.',
    'Warranty 10 years. Certifications: IEC 62619, UN38.3, CE. EMS integrated. Active balancing BMS. Grid-connected.',
    'Pricing: total 14500000 EUR, unit price 0.29 EUR/Wh.',
  ]),
  'competitor_tesla.pdf': buildPdf('Tesla Energy 50MWh Commercial Storage Bid', [
    'Company: Tesla Energy. Battery type LFP, rated capacity 50000 kWh, rated power 25000 kW, duration 2 hours.',
    'Cycle life 7000 cycles, inverter efficiency 98.0%, system efficiency 92.0%, energy density 280 Wh/L, DoD 95%.',
    'Warranty 10 years. Certifications: IEC 62619, UN38.3, CE, VDE-AR-N 4105. EMS integrated. Active balancing BMS. Grid-connected.',
    'Pricing: total 13800000 EUR, unit price 0.276 EUR/Wh.',
  ]),
};

for (const [name, content] of Object.entries(docs)) {
  fs.writeFileSync(path.join(outDir, name), content);
  console.log('生成', name, content.length, 'bytes');
}
console.log('完成。');
