import type { NextApiRequest, NextApiResponse } from 'next';
import contractsIndex from '../../../../contracts/contracts_index.json';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    index: contractsIndex as any,
    timestamp: new Date().toISOString()
  });
}

