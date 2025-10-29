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
  dueAt: z.coerce.string().datetime().optional(),
});

// Accept either a full contract payload OR a lightweight payload (templateId + answers)
const schema = z.object({
  title: z.string().min(3).optional(),
  templateId: z.string().optional(),
  answers: z.record(z.unknown()).optional(),
  payerId: z.string().optional(),
  payeeId: z.string().optional(),
  currency: z.string().min(3).default('EUR'),
  termsJson: z.record(z.unknown()).default({}),
  milestones: z.array(msSchema).min(1).optional(),
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
  const body = req.body;
  
  try {
    const payerId = body.payerId || `anon_${Math.random().toString(36).slice(2,10)}`;
    const payeeId = body.payeeId || `anon_${Math.random().toString(36).slice(2,10)}`;
    const currency = body.currency || 'EUR';

    // Build sensible defaults when minimal payload is provided
    const inferredTitle = body.title || (body.templateId ? `Contrat ${body.templateId}` : 'Contrat Symione');
    let milestones = body.milestones as any[] | undefined;
    if (!Array.isArray(milestones) || milestones.length < 1) {
      const est = Number(
        (body.answers && (body.answers.budget || body.answers.amount || body.answers.total)) ||
        body.totalAmount ||
        1000
      );
      const safeAmount = Number.isFinite(est) && est > 0 ? Math.round(est) : 1000;
      milestones = [
        {
          title: 'Paiement principal',
          description: 'Paiement initial du contrat',
          amount: safeAmount,
          // dueAt optional; omit so prisma gets null
        },
      ];
    }
    const total = body.totalAmount ?? milestones.reduce((s: any, m: any) => s + Number(m.amount), 0);
    const slug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    
    const created = await prisma.contract.create({
      data: {
        slug,
        title: inferredTitle,
        creatorId: payerId,
        payerId,
        payeeId,
        currency,
        totalAmount: total,
        termsJson: body.termsJson,
        status: ContractStatus.ACTIVE,
        milestones: {
          create: milestones.map((m: any) => ({ 
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


