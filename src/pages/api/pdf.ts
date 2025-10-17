import type { NextApiRequest, NextApiResponse } from 'next';
import inner from '@/api/export';

// Alias: clients may POST text + metadata and get application/pdf
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return (inner as any)(req, res);
}


