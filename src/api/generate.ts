import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { GenerateRequestSchema, GenerateResponseSchema } from '@/lib/validation/schemas';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getAIClient } from '@/services/ai/adapter';
import { loadContractTemplate } from '@/services/templates/loader';
import { buildPrompt } from '@/services/ai/generate';
import { rateLimit } from '@/middleware/rateLimit';
import { startMonitor, endMonitor, logAIUsage } from '@/lib/monitoring';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimit(req, res);
  const { requestId, startTime } = startMonitor('/api/generate');
  try {
    const { contract_id, user_inputs, lawyer_mode = false } = req.body;
    logger.info(`Generating contract ${contract_id}`, { lawyer_mode });

    const template = await loadContractTemplate(contract_id);
    const prompt = buildPrompt(template, user_inputs, lawyer_mode);
    const aiClient = getAIClient();
    const generatedContract = await aiClient.generate(prompt);
    logAIUsage(requestId, '/api/generate', Math.min(prompt.length / 4, 4000), process.env.AI_PROVIDER || 'local');

    const response = {
      contract_id,
      generated_text: generatedContract,
      timestamp: new Date().toISOString(),
      lawyer_mode,
    };
    return res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error generating contract');
    const status = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Failed to generate contract';
    const code = (error as any)?.code || 'GENERATION_FAILED';
    return res.status(status).json({ error: true, message, code });
  } finally {
    endMonitor(requestId, '/api/generate', startTime);
  }
}

export default withValidation(GenerateRequestSchema, GenerateResponseSchema, handler);

