import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { loadContractsIndex } from '@/services/templates/loader';

const RequestSchema = z.object({});
const ResponseSchema = z.object({ index: z.array(z.any()), timestamp: z.string() });

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const index = await loadContractsIndex();
  return res.status(200).json({ index, timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);

