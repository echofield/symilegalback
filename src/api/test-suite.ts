import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { rateLimit } from '@/middleware/rateLimit';
import { ErrorCode, sendError } from '@/lib/errors';
import { generateWithPdfKit } from '@/services/export/pdf';
import { getAIClient } from '@/services/ai/adapter';
import { env } from '@/config/env';
import pkg from '../../package.json';

interface TestSuiteResponse {
  pdf_generation: string;
  openai_connection: string;
  cors_headers: string;
  environment: string;
  version: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<TestSuiteResponse>) {
  if (req.method !== 'GET') {
    return sendError(res, 405, ErrorCode.METHOD_NOT_ALLOWED, 'Method not allowed');
  }

  const rateLimited = await rateLimit(req, res);
  if (rateLimited) return rateLimited;

  const status: TestSuiteResponse = {
    pdf_generation: '✓ Working',
    openai_connection: '✓ Connected',
    cors_headers: '✗ Missing',
    environment: env.nodeEnv,
    version: pkg.version,
  };

  try {
    await generateWithPdfKit('Vérification automatique du service PDF.');
  } catch (error) {
    console.error('[/api/test-suite] PDF generation check failed', error);
    status.pdf_generation = '✗ Failed';
  }

  try {
    const aiClient = getAIClient();
    const response = await aiClient.generate('Health check: répondez OK.', { maxTokens: 32 });
    if (!response) {
      status.openai_connection = '⚠️ No response';
    }
  } catch (error) {
    console.error('[/api/test-suite] AI connectivity check failed', error);
    status.openai_connection = '✗ Failed';
  }

  status.cors_headers = res.getHeader('Access-Control-Allow-Origin') ? '✓ Present' : '✗ Missing';
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(status);
}

export default withCors(handler);
