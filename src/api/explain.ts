import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { ExplainRequestSchema, ExplainResponseSchema } from '@/lib/validation/schemas';
import { getAIClient } from '@/services/ai/adapter';
import { rateLimit } from '@/middleware/rateLimit';
import { startMonitor, endMonitor, logAIUsage } from '@/lib/monitoring';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimit(req, res);
  const { requestId, startTime } = startMonitor('/api/explain');
  try {
    const { text } = req.body;
    const ai = getAIClient();
    const explanation = await ai.explain(text);
    logAIUsage(requestId, '/api/explain', Math.min(text.length / 4, 1000), process.env.AI_PROVIDER || 'local');
    return res.status(200).json({ explanation, timestamp: new Date().toISOString() });
  } finally {
    endMonitor(requestId, '/api/explain', startTime);
  }
}

export default withValidation(ExplainRequestSchema, ExplainResponseSchema, handler);

