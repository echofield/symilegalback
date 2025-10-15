import PDFDocument from 'pdfkit';

export interface PdfMetadata {
  title?: string;
  header?: string;
  footer?: string;
  author?: string;
  version?: string;
  date?: string;
}

export function normalizeContractText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\u2028|\u2029/g, '\n').trim();
}

export async function generateWithPdfKit(text: string, meta: PdfMetadata = {}): Promise<Buffer> {
  const normalized = normalizeContractText(text);
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica');

    if (meta.header) {
      doc.fontSize(10).fillColor('#666666').text(meta.header, { align: 'center' });
      doc.moveDown();
    }

    const title = meta.title ?? 'Contrat';
    doc.fillColor('#000000').fontSize(18).text(title, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(12).fillColor('#111111').text(normalized, {
      align: 'justify',
      lineGap: 4,
    });

    if (meta.footer) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#666666').text(meta.footer, { align: 'center' });
    }

    doc.end();
  });
}

export async function generateWithJsPdf(text: string, meta: PdfMetadata = {}): Promise<Buffer> {
  const normalized = normalizeContractText(text);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const width = 595.28; // A4 width in points
  const horizontalMargin = 48;
  const maxLineWidth = width - horizontalMargin * 2;

  let cursorY = 64;
  doc.setFont('helvetica', '');

  if (meta.header) {
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(meta.header, width / 2, cursorY, { align: 'center' });
    cursorY += 18;
  }

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(meta.title ?? 'Contrat', width / 2, cursorY, { align: 'center' });
  cursorY += 28;

  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  const paragraphs = normalized.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, maxLineWidth);
    doc.text(lines, horizontalMargin, cursorY, { align: 'left', maxWidth: maxLineWidth });
    cursorY += lines.length * 16 + 12;

    if (cursorY > 780) {
      doc.addPage();
      cursorY = 64;
    }
  }

  if (meta.footer) {
    if (cursorY > 760) {
      doc.addPage();
      cursorY = 64;
    }
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(meta.footer, width / 2, 800, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export function buildHtmlFallback(text: string, meta: PdfMetadata = {}): string {
  const normalized = normalizeContractText(text);
  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');

  const subtitleParts = [meta.author, meta.version, meta.date].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${meta.title ?? 'Contrat généré'}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      body {
        margin: 0;
        background: #f4f4f4;
        padding: 32px;
      }
      .document {
        background: #ffffff;
        color: #1a1a1a;
        max-width: 800px;
        margin: 0 auto;
        padding: 64px 72px;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
        border-radius: 12px;
      }
      h1 {
        font-size: 28px;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 16px;
      }
      .subtitle {
        font-size: 14px;
        color: #475569;
        margin-bottom: 32px;
      }
      .meta {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 12px;
      }
      .content {
        font-size: 15px;
        line-height: 1.7;
        white-space: normal;
        word-break: break-word;
      }
      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }
        .document {
          box-shadow: none;
          border-radius: 0;
        }
      }
    </style>
  </head>
  <body>
    <article class="document">
      <header>
        <h1>${meta.title ?? 'Contrat généré'}</h1>
        ${subtitleParts.length ? `<p class="subtitle">${subtitleParts.join(' • ')}</p>` : ''}
        ${meta.header ? `<p class="meta">${meta.header}</p>` : ''}
      </header>
      <section class="content">${escaped}</section>
      ${meta.footer ? `<footer class="meta">${meta.footer}</footer>` : ''}
    </article>
  </body>
</html>`;
}

