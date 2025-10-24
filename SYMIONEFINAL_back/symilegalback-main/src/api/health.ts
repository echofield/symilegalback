import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}

export default withCors(handler);

