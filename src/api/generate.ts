import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { GenerateRequestSchema, GenerateResponseSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCode, sendError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getAIClient } from '@/services/ai/adapter';
import { loadContractTemplate } from '@/services/templates/loader';
import { buildPrompt } from '@/services/ai/generate';
import { rateLimit } from '@/middleware/rateLimit';
import { startMonitor, endMonitor, logAIUsage } from '@/lib/monitoring';
import { formatContract } from '@/utils/formatting';
import { env } from '@/config/env';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimit(req, res);
  const { requestId, startTime } = startMonitor('/api/generate');
  try {
    const { contract_id, user_inputs, lawyer_mode = false } = req.body;
    logger.info(`Generating contract ${contract_id}`, { lawyer_mode, requestId });

    const template = await loadContractTemplate(contract_id);
    const prompt = buildPrompt(template, user_inputs, lawyer_mode);
    const aiClient = getAIClient();
    const generatedContract = await aiClient.generate(prompt);
    logAIUsage(requestId, '/api/generate', Math.min(prompt.length / 4, 4000), env.aiProvider);

    const formatted = formatContract(generatedContract);
    const response = {
      success: true as const,
      contract: {
        formatted_text: formatted.formatted_text,
        html: formatted.html,
        sections: formatted.sections,
        metadata: {
          ...formatted.metadata,
          generated_at: new Date().toISOString(),
          version: formatted.metadata.version ?? template.metadata.version ?? '1.0.0',
          language: 'fr',
        },
      },
      contract_id,
      lawyer_mode,
      request_id: requestId,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error, requestId }, 'Error generating contract');
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(error.toResponse());
    }
    const message = (error as any)?.message ?? 'Failed to generate contract';
    return sendError(res, (error as any)?.statusCode ?? 500, ErrorCode.GENERATION_FAILED, message);
  } finally {
    endMonitor(requestId, '/api/generate', startTime);
  }
}

export default withCors(withValidation(GenerateRequestSchema, GenerateResponseSchema, handler));

