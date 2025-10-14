import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { loadContractTemplate, getJurisdictionMap } from '@/services/templates/loader';
import { z } from 'zod';
import { ContractTemplateSchema } from '@/lib/validation/schemas';

const RequestSchema = z.object({ id: z.string(), jurisdiction: z.string().optional() });
const ResponseSchema = z.object({ template: ContractTemplateSchema, timestamp: z.string() });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      throw new AppError('Method not allowed', 405);
    }
    const { id, jurisdiction } = req.query as { id: string; jurisdiction?: string };
    logger.info({ id, jurisdiction }, 'Loading contract template');
    const template = await loadContractTemplate(id);
    const j = (jurisdiction || '').toUpperCase();
    if (j === 'FR' || j === 'EN') {
      const map = await getJurisdictionMap();
      const lang = map[id];
      if (lang && lang !== (j as 'FR' | 'EN')) {
        return res.status(404).json({ error: true, message: 'Template not found for jurisdiction' });
      }
    }
    return res.status(200).json({ template, timestamp: new Date().toISOString() });
  } catch (error) {
    const status = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Failed to load template';
    return res.status(status).json({ error: true, message });
  }
}

export default withValidation(RequestSchema, ResponseSchema, handler);

