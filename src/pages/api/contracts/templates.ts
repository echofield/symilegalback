import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getBondTemplates, getBondTemplateById } from '@/lib/bondTemplates';

const querySchema = z.object({ id: z.string().optional() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: true, message: 'Invalid query' });

    const id = parsed.data.id;
    if (id) {
      const tpl = await getBondTemplateById(id);
      return res.status(200).json({ ok: true, templates: tpl ? [tpl] : [] });
    }

    const all = await getBondTemplates();
    return res.status(200).json({ ok: true, templates: all });
  } catch (err: any) {
    console.error('templates endpoint error', err?.message || err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}


