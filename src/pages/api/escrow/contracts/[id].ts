import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const id = String(req.query.id || '');
    if (!id) return res.status(400).json({ error: true, message: 'Missing id' });

    const c = await prisma.contract.findUnique({
      where: { id },
      include: { milestones: true },
    });
    if (!c) return res.status(404).json({ error: true, message: 'Not found' });

    return res.status(200).json({
      ok: true,
      contract: {
        id: c.id,
        title: c.title,
        status: c.status,
        currency: c.currency,
        totalAmount: c.totalAmount,
        termsJson: c.termsJson,
        milestones: c.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          amount: m.amount,
          status: m.status,
          dueAt: m.dueAt,
        })),
      },
    });
  } catch (err: any) {
    console.error('contracts detail error', err?.message || err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}


