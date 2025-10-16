import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });

  const { query } = req.body || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: true, message: 'Missing or invalid query' });
  }

  const lawyers = [
    { name: 'Maître Dupont', address: 'Paris 8e', rating: 4.7, lat: 48.871, lng: 2.303 },
    { name: 'Cabinet Martin', address: 'Lyon 2e', rating: 4.5, lat: 45.757, lng: 4.835 },
  ];

  return res.status(200).json({ lawyers });
}
