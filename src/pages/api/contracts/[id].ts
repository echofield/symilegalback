import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: true, message: 'Missing contract ID' });
  }

  try {
    const filePath = path.join(process.cwd(), 'src/lib/data/contracts-fr.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const list = JSON.parse(raw);

    const template = list.find((c: any) => c.id === id);
    if (!template) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }

    return res.status(200).json({ template });
  } catch (err) {
    console.error('Contract read error', err);
    return res.status(500).json({ error: true, message: 'Failed to read contract' });
  }
}
