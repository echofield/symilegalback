import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { ExportRequestSchema } from '@/lib/validation/schemas';
import { generatePdfBuffer } from '@/services/export/pdf';
import { exportDocx } from '@/services/export/docx';
import path from 'path';
import fs from 'fs/promises';

const ResponseSchema = {} as any;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { contract_text, format, metadata } = req.body as any;
  const fileBase = `contract_${Date.now()}`;
  const outDir = path.join(process.cwd(), 'public', 'exports');
  await fs.mkdir(outDir, { recursive: true });
  const header = `Version: ${metadata?.version || '1.0.0'}${metadata?.author ? ' • Author: ' + metadata.author : ''}`;
  const footer = `Review: ${metadata?.review_status || 'n/a'} • ${new Date().toISOString()}`;
  const meta = { header, footer };
  let buffer: Buffer;
  if (format === 'pdf') {
    buffer = await generatePdfBuffer(contract_text, meta);
  } else {
    buffer = await exportDocx(contract_text, meta);
  }
  const filename = `${fileBase}.${format}`;
  const outPath = path.join(outDir, filename);
  await fs.writeFile(outPath, buffer);

  // Stream file and then cleanup
  res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);

  setTimeout(() => { fs.rm(outPath).catch(() => {}); }, 30_000);
}

export default withValidation(ExportRequestSchema as any, ResponseSchema, handler);

