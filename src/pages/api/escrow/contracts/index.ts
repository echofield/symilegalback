import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mockContracts = [
      {
        id: 'bond-001',
        title: 'Contrat Freelance Demo',
        status: 'active',
        amount: 5000,
        currency: 'EUR'
      },
      {
        id: 'bond-002', 
        title: 'Contrat IT Demo',
        status: 'pending',
        amount: 12000,
        currency: 'EUR'
      }
    ];

    return res.status(200).json({
      success: true,
      contracts: mockContracts,
      total: mockContracts.length
    });

  } catch (error: any) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
}