import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ContractStatus } from '@prisma/client';

const msSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  amount: z.number().int().positive(),
  dueAt: z.string().datetime().optional(),
});

const schema = z.object({
  title: z.string().min(3),
  payerId: z.string(),
  payeeId: z.string(),
  currency: z.string().min(3),
  termsJson: z.any(),
  milestones: z.array(msSchema).min(1),
  totalAmount: z.number().int().positive().optional(),
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: true, issues: body.error.issues });

  const total = body.data.totalAmount ?? body.data.milestones.reduce((s, m) => s + m.amount, 0);
  const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await prisma.contract.create({
    data: {
      slug,
      title: body.data.title,
      creatorId: body.data.payerId,
      payerId: body.data.payerId,
      payeeId: body.data.payeeId,
      currency: body.data.currency,
      totalAmount: total,
      termsJson: body.data.termsJson,
      status: ContractStatus.ACTIVE,
      milestones: {
        create: body.data.milestones.map((m) => ({ title: m.title, description: m.description, amount: m.amount, dueAt: m.dueAt ? new Date(m.dueAt) : null })),
      },
    },
    include: { milestones: true },
  });
  res.status(200).json(created);
}


