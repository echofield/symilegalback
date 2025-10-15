import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/advisor';

export const runtime = 'nodejs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return (inner as any)(req, res);
}


