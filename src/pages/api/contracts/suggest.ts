import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { suggestContractFR } from '@/services/ai/generate';

const schema = z.object({
  description: z.string().min(10),
  budget: z.coerce.number().int().positive().optional(),
  roleA: z.string().optional(),
  roleB: z.string().optional(),
  answers: z.record(z.unknown()).optional(),
});

const ResponseSchema = z.object({
  success: z.boolean(),
  contract: z.string(),
  suggestions: z.array(z.string()).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;
  
  try {
    // Reuse existing AI pipeline; if answers provided, inject into context
    const input = { ...body };
    if (input.answers) {
      try {
        const desc = Array.isArray(input.answers)
          ? input.answers.map((a: any) => `${a?.id || ''}: ${a?.value || a?.answer || a}`).join(', ')
          : Object.entries(input.answers).map(([k, v]) => `${k}: ${v}`).join(', ');
        input.description = `${input.description}\n\nRéponses de l'utilisateur : ${desc}.`;
      } catch {}
    }
    
    const draft = await suggestContractFR(input);
    return res.status(200).json(draft);
  } catch (error) {
    console.error('Contract suggestion error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to suggest contract',
      timestamp: new Date().toISOString(),
    });
  }
}

export default withCors({}, withValidation(schema, ResponseSchema, handler));


