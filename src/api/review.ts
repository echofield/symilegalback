import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { ReviewRequestSchema, ReviewResponseSchema } from '@/lib/validation/schemas';
import { getAIClient } from '@/services/ai/adapter';
import { rateLimit } from '@/middleware/rateLimit';
import { startMonitor, endMonitor, logAIUsage } from '@/lib/monitoring';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimit(req, res);
  const { requestId, startTime } = startMonitor('/api/review');
  try {
    const { contract_text } = req.body;
    const ai = getAIClient();
    const review = await ai.review(contract_text);
    logAIUsage(requestId, '/api/review', Math.min(contract_text.length / 4, 2000), process.env.AI_PROVIDER || 'local');
    return res.status(200).json({ ...review, timestamp: new Date().toISOString() });
  } finally {
    endMonitor(requestId, '/api/review', startTime);
  }
}

export default withValidation(ReviewRequestSchema, ReviewResponseSchema, handler);

