import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractsIndex } from '@/services/templates/loader';
import { ContractsIndexEntrySchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/logger';

const RequestSchema = z.object({ jurisdiction: z.string().optional() });
const ResponseSchema = z.object({ index: z.array(ContractsIndexEntrySchema), timestamp: z.string() });

async function handler(req: NextApiRequest, _res: NextApiResponse) {
  try {
    const { jurisdiction } = req.query as { jurisdiction?: string };
    console.log('contracts:index start', { jurisdiction });
    logger.info({ jurisdiction }, 'contracts:index request');
    let index = await loadContractsIndex();
    if (jurisdiction && jurisdiction.toUpperCase() !== 'FR') {
      index = [];
    }
    const payload = { index, timestamp: new Date().toISOString() };
    logger.info({ count: index.length }, 'contracts:index response');
    console.log('contracts:index ok', { count: index.length });
    return payload; // withValidation will validate and send
  } catch (err: any) {
    logger.error({ err }, 'contracts:index failed');
    console.error('contracts:index failed', err);
    return { index: [], timestamp: new Date().toISOString() };
  }
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));

