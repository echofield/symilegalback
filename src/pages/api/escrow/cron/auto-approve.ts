import { prisma } from '@/lib/prisma';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

    // Lightweight feature guard
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: true, message: 'Unauthorized' });

    const hours = Number(process.env.BOND_AUTO_APPROVE_HOURS || 72);
    const threshold = new Date(Date.now() - hours * 3600 * 1000);

    const toApprove = await prisma.milestone.findMany({
      where: { status: 'SUBMITTED', submittedAt: { lte: threshold } },
      select: { id: true },
    });

    let count = 0;
    for (const ms of toApprove) {
      await prisma.milestone.update({ where: { id: ms.id }, data: { status: 'PAID', approvedAt: new Date() } });
      count += 1;
    }

    return res.status(200).json({ ok: true, autoApproved: count });
  } catch (err: any) {
    console.error('cron/auto-approve error', err?.message || err);
    return res.status(500).json({ error: true, message: 'Internal error' });
  }
}


