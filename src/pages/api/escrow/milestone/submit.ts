import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { MilestoneStatus } from '@prisma/client';

const schema = z.object({
  milestoneId: z.string(),
  proofs: z.array(z.object({ url: z.string().url(), kind: z.enum(['file', 'link', 'note']) })),
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: true });

  const { milestoneId, proofs } = body.data;
  await prisma.$transaction(async (tx) => {
    await tx.proof.createMany({ data: proofs.map((p) => ({ ...p, milestoneId })) });
    await tx.milestone.update({ where: { id: milestoneId }, data: { status: MilestoneStatus.SUBMITTED, submittedAt: new Date() } });
  });
  res.status(200).json({ ok: true });
}


