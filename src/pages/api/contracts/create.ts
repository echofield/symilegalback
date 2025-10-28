import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withCors } from '@/lib/http/cors';
import { ContractStatus } from '@prisma/client';
import type { ContractCreateResponse } from '@/types/api';
import { withValidation } from '@/lib/validation/middleware';

const msSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  amount: z.coerce.number().int().positive(),
  dueAt: z.string().datetime().optional(),
});

const schema = z.object({
  title: z.string().min(3),
  payerId: z.string().optional(),
  payeeId: z.string().optional(),
  currency: z.string().min(3).optional().default('eur'),
  termsJson: z.record(z.unknown()).optional().default({}),
  milestones: z.array(msSchema).min(1),
  totalAmount: z.coerce.number().int().positive().optional(),
});

const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    status: z.string(),
    totalAmount: z.number(),
    milestones: z.array(z.object({
      id: z.string(),
      title: z.string(),
      amount: z.number(),
    })),
  }),
  message: z.string(),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<ContractCreateResponse | { error: true; message: string; timestamp: string }>) {
  const body = req.body as z.infer<typeof schema>;
  
  try {
    const total = body.totalAmount ?? body.milestones.reduce((s: any, m: any) => s + Number(m.amount || 0), 0);
    const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const payerId = body.payerId || `anon_${slug}`;
    const payeeId = body.payeeId || `anon_${Math.random().toString(36).slice(2, 8)}`;
    const currency = (body.currency || 'eur').toUpperCase();
    const termsJson = body.termsJson || {};
    
    const created = await prisma.contract.create({
      data: {
        slug,
        title: body.title,
        creatorId: payerId,
        payerId,
        payeeId,
        currency,
        totalAmount: total,
        termsJson: termsJson as any,
        status: ContractStatus.ACTIVE,
        milestones: {
          create: body.milestones.map((m: any) => ({ 
            title: m.title, 
            description: m.description, 
            amount: m.amount, 
            dueAt: m.dueAt ? new Date(m.dueAt) : null 
          })),
        },
      },
      include: { milestones: true },
    });
    
    return res.status(200).json({
      success: true,
      data: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        status: created.status,
        totalAmount: created.totalAmount,
        milestones: created.milestones.map(m => ({
          id: m.id,
          title: m.title,
          amount: m.amount,
        })),
      },
      message: 'Contract created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Contract creation error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to create contract',
      timestamp: new Date().toISOString(),
    });
  }
}

export default withCors({}, withValidation(schema, ResponseSchema, handler));


