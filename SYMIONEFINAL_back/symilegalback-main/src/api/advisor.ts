import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { runAdvisorLoop } from '@/services/ai/advisor';

const RequestSchema = z.object({
  question: z.string().min(1),
  context: z.record(z.any()).optional(),
});

const ResponseSchema = z.object({
  output: z.object({
    thought: z.string(),
    followup_question: z.string().nullable(),
    action: z.object({ type: z.string(), args: z.record(z.any()).optional() }),
    reply_text: z.string(),
  }),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }
  const { question, context } = req.body as { question: string; context?: Record<string, any> };
  const raw = await runAdvisorLoop(question, context || {});
  return res.status(200).json({ output: raw, timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);


