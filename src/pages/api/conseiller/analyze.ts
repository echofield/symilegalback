import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/conseiller/analyze';

export const runtime = 'nodejs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Delegate to inner implementation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (inner as any)(req, res);
}


