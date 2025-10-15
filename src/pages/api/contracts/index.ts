import type { NextApiRequest, NextApiResponse } from 'next';
import contractsIndex from '../../../../contracts/contracts_index.json';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { ContractsIndexEntrySchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';

const RequestSchema = z.object({ jurisdiction: z.string().optional() });
const ResponseSchema = z.object({ index: z.array(ContractsIndexEntrySchema), timestamp: z.string() });

async function handler(req: NextApiRequest, _res: NextApiResponse) {
  const { jurisdiction } = req.query as { jurisdiction?: string };
  let index = (contractsIndex as any[]).map((e) => ({ ...e, locale: e.path.includes('/contracts/') ? (e.path.includes('/employment/') || e.path.includes('/property/') || e.path.includes('/personal/') || e.path.includes('/closure/') || e.path.includes('/business/') ? 'FR' : 'EN') : 'EN' }));
  if (jurisdiction) {
    const j = jurisdiction.toUpperCase();
    index = index.filter((e) => (j === 'FR' ? e.locale === 'FR' : j === 'EN' ? e.locale === 'EN' : true));
  }
  return { index, timestamp: new Date().toISOString() };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));

