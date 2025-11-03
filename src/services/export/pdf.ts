import PDFDocument from 'pdfkit';

function htmlFromText(text: string, header?: string, footer?: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Contrat</title>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@400;500;600;700&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'EB Garamond', serif; font-size: 16px; line-height: 1.7; color: #1a1a1a; background: #fafafa; padding: 20px; }
      .contract-container { max-width: 210mm; margin: 0 auto; background: #fff; box-shadow: 0 0 30px rgba(0,0,0,0.08); padding: 80px 90px; min-height: 297mm; }
      .header { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid #333; }
      .document-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 400; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 20px; color: #000; }
      .document-subtitle { font-size: 13px; color: #444; letter-spacing: 1.5px; line-height: 1.6; text-transform: uppercase; font-weight: 400; }
      .article { margin: 40px 0; page-break-inside: avoid; }
      .article-content { text-align: justify; font-size: 15px; line-height: 1.8; }
      .signature-section { margin-top: 90px; page-break-inside: avoid; }
      .signature-header { text-align: center; font-family: 'Roboto', sans-serif; font-size: 12px; font-weight: 400; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 20px; }
      .meta { font-size: 12px; color: #666; text-align: center; margin-top: 20px; }
      @media print { body { background: #fff; padding: 0; } .contract-container { box-shadow: none; padding: 60px 70px; } }
    </style>
  </head>
  <body>
    <div class="contract-container">
      <div class="header">
        <h1 class="document-title">Contrat</h1>
        <div class="document-subtitle">Document généré automatiquement</div>
      </div>
      ${header ? `<div class="meta">${header}</div>` : ''}
      <div class="article">
        <div class="article-content">${escaped}</div>
      </div>
      ${footer ? `<div class="meta">${footer}</div>` : ''}
    </div>
  </body>
  </html>`;
}

export async function generatePdfBuffer(text: string, meta?: { header?: string; footer?: string }): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Header meta (version/date)
    if (meta?.header) {
      doc.font('Helvetica').fontSize(9).fillColor('#666').text(meta.header, { align: 'center' });
      doc.moveDown(0.5);
    }

    // Parse the incoming plain text into logical blocks to style hierarchy
    const plain = text.replace(/\r\n/g, '\n');
    const lines = plain.split('\n');

    // Detect a specific contract title on the first non-empty line
    const firstNonEmptyIndex = lines.findIndex(l => l.trim().length > 0);
    let customTitle: string | null = null;
    if (firstNonEmptyIndex >= 0) {
      const first = lines[firstNonEmptyIndex].trim();
      if (/^(Contrat|Bail|Accord|Convention)/i.test(first)) {
        customTitle = first;
        lines[firstNonEmptyIndex] = ''; // consume it from body
      }
    }

    // Optional governing law line right after
    let subTitle: string | null = null;
    const nextIdx = (firstNonEmptyIndex >= 0) ? lines.findIndex((l, i) => i > firstNonEmptyIndex && l.trim().length > 0) : -1;
    if (nextIdx > -1) {
      const maybeLaw = lines[nextIdx].trim();
      if (/juridiction|gouverning|gouvernement|jurisdiction|law/i.test(maybeLaw) || /Governing law/i.test(maybeLaw)) {
        subTitle = maybeLaw;
        lines[nextIdx] = '';
      }
    }

    // Title block
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(20).text(customTitle || 'Contrat', { align: 'center' });
    if (subTitle) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#444').text(subTitle, { align: 'center' });
    }
    doc.moveDown();

    // Content rendering with hierarchy
    doc.font('Helvetica').fillColor('#111');
    const numberedHeading = /^\s*(\d{1,2})\.\s+(.+)/;
    const smallGap = () => doc.moveDown(0.5);
    const normalGap = () => doc.moveDown(1);

    for (const raw of lines) {
      const line = raw || '';
      const trimmed = line.trim();
      if (!trimmed) { continue; }

      const m = trimmed.match(numberedHeading);
      if (m) {
        // Section heading like "1. Parties"
        normalGap();
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#000').text(`${m[1]}. ${m[2]}`);
        smallGap();
        doc.font('Helvetica').fontSize(12).fillColor('#111');
        continue;
      }

      // Bullet points
      if (/^[•\-]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[•\-]\s+/, '');
        doc.circle(doc.x - 4, doc.y - 2, 1.2).fill('#000').fillColor('#111');
        doc.fontSize(12).text(bulletText, doc.x + 4, doc.y - 5, { align: 'justify' });
        smallGap();
        continue;
      }

      // Normal paragraph
      doc.fontSize(12).fillColor('#111').text(trimmed, { align: 'justify' });
      smallGap();
    }

    // Footer meta (date)
    if (meta?.footer) {
      normalGap();
      doc.font('Helvetica').fontSize(9).fillColor('#666').text(meta.footer, { align: 'center' });
    }

    doc.end();
  });
}

