import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/export';

export const runtime = 'nodejs';

// Alias: clients may POST text + metadata and get application/pdf
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return (inner as any)(req, res);
}


