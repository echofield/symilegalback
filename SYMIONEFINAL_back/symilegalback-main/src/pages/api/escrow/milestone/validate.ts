import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ milestoneId: z.string() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: true });

  const ms = await prisma.milestone.findUnique({ where: { id: parsed.data.milestoneId }, include: { contract: true } });
  if (!ms) return res.status(404).json({ error: true, message: 'Milestone not found' });
  if (ms.status !== 'SUBMITTED') return res.status(400).json({ error: true, message: 'Milestone not submitted' });

  await prisma.milestone.update({ where: { id: ms.id }, data: { status: 'PAID' as any, approvedAt: new Date() } });
  const remaining = await prisma.milestone.count({ where: { contractId: ms.contractId, NOT: { status: 'PAID' as any } } });
  if (remaining === 0) await prisma.contract.update({ where: { id: ms.contractId }, data: { status: 'COMPLETED' } as any });

  await prisma.payoutLog.create({ data: { milestoneId: ms.id, payeeEmail: 'manual', amount: ms.amount, method: 'manual', status: 'pending' } });
  res.status(200).json({ ok: true });
}


