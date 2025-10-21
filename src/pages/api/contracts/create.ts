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
  amount: z.number().int().positive(),
  dueAt: z.string().datetime().optional(),
});

const schema = z.object({
  title: z.string().min(3),
  payerId: z.string(),
  payeeId: z.string(),
  currency: z.string().min(3),
  termsJson: z.record(z.unknown()),
  milestones: z.array(msSchema).min(1),
  totalAmount: z.number().int().positive().optional(),
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

async function handler(req: NextApiRequest, res: NextApiResponse<ContractCreateResponse>) {
  const body = req.body;
  
  try {
    const total = body.totalAmount ?? body.milestones.reduce((s: any, m: any) => s + m.amount, 0);
    const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    
    const created = await prisma.contract.create({
      data: {
        slug,
        title: body.title,
        creatorId: body.payerId,
        payerId: body.payerId,
        payeeId: body.payeeId,
        currency: body.currency,
        totalAmount: total,
        termsJson: body.termsJson,
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


