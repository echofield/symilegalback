import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/contracts/index';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return (inner as any)(req, res);
}

