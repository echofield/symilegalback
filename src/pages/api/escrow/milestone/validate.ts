import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { MilestoneStatus } from '@prisma/client';

const schema = z.object({ milestoneId: z.string() });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: true });

  const ms = await prisma.milestone.findUnique({ where: { id: parsed.data.milestoneId }, include: { contract: true } });
  if (!ms) return res.status(404).json({ error: true, message: 'Milestone not found' });
  if (ms.status !== 'SUBMITTED') return res.status(400).json({ error: true, message: 'Milestone not submitted' });

  await prisma.milestone.update({ where: { id: ms.id }, data: { status: MilestoneStatus.PAID, approvedAt: new Date() } });
  const remaining = await prisma.milestone.count({ where: { contractId: ms.contractId, NOT: { status: MilestoneStatus.PAID } } });
  if (remaining === 0) await prisma.contract.update({ where: { id: ms.contractId }, data: { status: 'COMPLETED' } as any });

  await prisma.payoutLog.create({ data: { milestoneId: ms.id, payeeEmail: 'manual', amount: ms.amount, method: 'manual', status: 'pending' } });
  res.status(200).json({ ok: true });
}


