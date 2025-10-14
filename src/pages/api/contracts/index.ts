import type { NextApiRequest, NextApiResponse } from 'next';
import contractsIndex from '../../../../contracts/contracts_index.json';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { ContractsIndexEntrySchema } from '@/lib/validation/schemas';

const RequestSchema = z.object({ jurisdiction: z.string().optional() });
const ResponseSchema = z.object({ index: z.array(ContractsIndexEntrySchema), timestamp: z.string() });

async function handler(req: NextApiRequest, _res: NextApiResponse) {
  const { jurisdiction } = req.query as { jurisdiction?: string };
  let index = contractsIndex as any[];
  if (jurisdiction && jurisdiction.toUpperCase() !== 'FR') {
    index = [];
  }
  return { index, timestamp: new Date().toISOString() };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));

