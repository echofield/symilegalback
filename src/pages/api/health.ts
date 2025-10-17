import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/health';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return (inner as any)(req, res);
}

