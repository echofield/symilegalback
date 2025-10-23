import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { withValidation } from '@/lib/validation/middleware';

const RequestSchema = z.object({ id: z.string() });
const ResponseSchema = z.object({ comments: z.array(z.any()), timestamp: z.string() });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Placeholder comments API
  return res.status(200).json({ comments: [], timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);

