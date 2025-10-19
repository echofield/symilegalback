import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const items = await prisma.contract.findMany({
      select: {
        id: true,
        title: true,
        totalAmount: true,
        currency: true,
        status: true,
        createdAt: true,
        milestones: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const contracts = items.map((c: { id: string; title: string; totalAmount: number; currency: string; status: string; createdAt: Date; milestones: { status: string; amount: number }[] }) => {
      const milestonesCount = c.milestones.length;
      const paidCount = c.milestones.filter((m: { status: string }) => m.status === 'PAID').length;
      return {
        id: c.id,
        title: c.title,
        totalAmount: c.totalAmount,
        currency: c.currency,
        status: c.status,
        createdAt: c.createdAt,
        milestonesCount,
        paidCount,
      };
    });

    return res.status(200).json({ ok: true, contracts });
  } catch (err: any) {
    console.error('contracts list error', err?.message || err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}


