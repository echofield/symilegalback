import puppeteer from 'puppeteer';

function htmlFromText(text: string, header?: string, footer?: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,Helvetica,sans-serif;line-height:1.4;padding:32px;}
  h1,h2,h3{margin:16px 0 8px}
  </style></head><body>
  ${header ? `<div style="font-size:12px;color:#666;">${header}</div><hr/>` : ''}
  <div>${escaped}</div>
  ${footer ? `<hr/><div style="font-size:12px;color:#666;">${footer}</div>` : ''}
  </body></html>`;
}

export async function generatePdfBuffer(text: string, meta?: { header?: string; footer?: string }, htmlOverride?: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const html = htmlOverride || htmlFromText(text, meta?.header, meta?.footer);
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '16mm', right: '16mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

