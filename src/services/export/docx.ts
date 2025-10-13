import { Document, Packer, Paragraph, HeadingLevel, TextRun, Header, Footer } from 'docx';

export async function exportDocx(text: string, meta?: { header?: string; footer?: string }): Promise<Buffer> {
  const lines = text.split(/\r?\n/);
  const children: Paragraph[] = [];
  for (const line of lines) {
    if (!line.trim()) { children.push(new Paragraph('')); continue; }
    const headingMatch = /^(#+)\s*(.*)/.exec(line);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3);
      children.push(new Paragraph({ text: headingMatch[2], heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1] }));
    } else {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }

  const header = meta?.header ? new Header({ children: [new Paragraph({ children: [new TextRun({ text: meta.header, size: 18, color: '666666' })] })] }) : undefined;
  const footer = meta?.footer ? new Footer({ children: [new Paragraph({ children: [new TextRun({ text: meta.footer, size: 18, color: '666666' })] })] }) : undefined;

  const doc = new Document({
    sections: [{
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children,
    }],
  });
  return await Packer.toBuffer(doc);
}

