import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withCors } from '@/lib/http/cors';
import { MilestoneStatus } from '@prisma/client';
import { withValidation } from '@/lib/validation/middleware';

const schema = z.object({
  milestoneId: z.string(),
  proofs: z.array(z.object({ url: z.string().url(), kind: z.enum(['file', 'link', 'note']) })),
});

const ResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;
  
  try {
    const { milestoneId, proofs } = body;
    
    await prisma.$transaction(async (tx) => {
      await tx.proof.createMany({ data: proofs.map((p: any) => ({ ...p, milestoneId })) });
      await tx.milestone.update({ 
        where: { id: milestoneId }, 
        data: { 
          status: MilestoneStatus.SUBMITTED, 
          submittedAt: new Date() 
        } 
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Milestone submitted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Milestone submission error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to submit milestone',
      timestamp: new Date().toISOString(),
    });
  }
}

export default withCors({}, withValidation(schema, ResponseSchema, handler));


