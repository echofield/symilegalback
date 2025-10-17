import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { withValidation } from '@/lib/validation/middleware';

const RequestSchema = z.object({ id: z.string() });
const ResponseSchema = z.object({ versions: z.array(z.any()), timestamp: z.string() });

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ versions: [], timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);

