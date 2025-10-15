import PDFDocument from 'pdfkit';

interface JsPdfOptions {
  unit?: string;
  format?: string | number[];
  orientation?: 'portrait' | 'landscape' | string;
}

type TextOptions = {
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
};

type PdfKitDocument = InstanceType<typeof PDFDocument>;

export class jsPDF {
  private doc: PdfKitDocument;
  private buffers: Buffer[] = [];
  private fontName = 'Helvetica';
  private fontSizeValue = 12;
  private textColor: [number, number, number] = [0, 0, 0];
  private ended = false;

  constructor(options: JsPdfOptions = {}) {
    const pageSize = Array.isArray(options.format) ? options.format : 'A4';
    this.doc = new PDFDocument({ size: pageSize, margin: 48 });
    this.doc.on('data', (chunk: Buffer) => this.buffers.push(chunk));
    this.doc.on('end', () => {
      this.ended = true;
    });
    this.doc.font(this.fontName).fontSize(this.fontSizeValue);
  }

  setFont(fontName: string, _fontStyle?: string) {
    this.fontName = fontName || this.fontName;
    try {
      this.doc.font(this.fontName);
    } catch {
      this.doc.font('Helvetica');
    }
  }

  setFontSize(size: number) {
    this.fontSizeValue = size;
    this.doc.fontSize(size);
  }

  setTextColor(r: number, g?: number, b?: number) {
    this.textColor = [r, g ?? r, b ?? r];
    this.doc.fillColor(`rgb(${this.textColor.join(',')})`);
  }

  splitTextToSize(text: string | string[], maxWidth: number): string[] {
    const source = Array.isArray(text) ? text.join('\n') : text;
    const words = source.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.doc.widthOfString(candidate) > maxWidth) {
        if (current) {
          lines.push(current);
        }
        current = word;
      } else {
        current = candidate;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines.length ? lines : [source];
  }

  text(content: string | string[], x: number, y: number, options: TextOptions = {}) {
    if (this.ended) {
      throw new Error('Document already finalized');
    }

    const lines = Array.isArray(content) ? content : [content];
    this.doc.font(this.fontName).fontSize(this.fontSizeValue).fillColor(`rgb(${this.textColor.join(',')})`);
    for (const line of lines) {
      this.doc.text(line, x, y, {
        align: options.align ?? 'left',
        width: options.maxWidth,
        continued: false,
      });
      y += this.fontSizeValue * 1.35;
    }
  }

  addPage() {
    if (this.ended) {
      throw new Error('Document already finalized');
    }
    this.doc.addPage();
  }

  output(type: string = 'string'): string | ArrayBuffer {
    if (!this.ended) {
      this.doc.end();
    }
    const buffer = Buffer.concat(this.buffers);
    if (type === 'arraybuffer') {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    return buffer.toString('binary');
  }
}
