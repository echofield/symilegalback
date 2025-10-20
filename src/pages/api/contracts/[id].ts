import type { NextApiRequest, NextApiResponse } from 'next';
import contractsIndex from '../../../../contracts/contracts_index.json';
import path from 'path';
import fs from 'fs/promises';
import { withCors } from '@/lib/http/cors';

export const runtime = 'nodejs';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const entry = (contractsIndex as any[]).find((e) => e.id === id);
  if (!entry) {
    return res.status(404).json({ error: true, message: 'Template not found' });
  }
  try {
    const filePath = path.join(process.cwd(), String(entry.path).replace(/^\//, ''));
    const raw = await fs.readFile(filePath, 'utf-8');
    const template = JSON.parse(raw);
    return res.status(200).json({ template, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err?.message || 'Failed to load template' });
  }
}

export default withCors({}, handler);

