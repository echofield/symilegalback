import type { NextApiRequest, NextApiResponse } from 'next';
import exportHandler from './export';

// Alias: clients may POST text + metadata and get application/pdf
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return exportHandler(req, res);
}
