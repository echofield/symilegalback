import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const contracts = [
    { id: '1', title: 'Freelance Contract', amount: 5000 },
    { id: '2', title: 'IT Services', amount: 12000 }
  ];

  return res.status(200).json({ contracts });
}
