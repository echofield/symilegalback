import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { generatePdfBuffer } from '@/services/export/pdf';
import { exportDocx } from '@/services/export/docx';
import { rateLimit } from '@/middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await rateLimit(req, res);
  if (res.headersSent) return;

  try {
    const { contract_text, format = 'pdf', metadata = {} } = req.body as any;
    if (!contract_text || typeof contract_text !== 'string') {
      return res.status(400).json({ error: 'Invalid request', message: 'contract_text is required' });
    }

    let buffer: Buffer;
    let contentType = 'application/pdf';
    let ext = 'pdf';

    if (format === 'pdf') {
      const header = metadata?.version ? `Version: ${metadata.version}` : undefined;
      const footer = new Date().toISOString().split('T')[0];
      buffer = await generatePdfBuffer(contract_text, { header, footer });
    } else if (format === 'docx') {
      buffer = await exportDocx(contract_text, metadata);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      ext = 'docx';
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="contract.${ext}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('Export error', err);
    return res.status(500).json({ error: 'Export failed', message: err?.message || 'unknown' });
  }
}

export default withCors(handler);
