import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const contracts = [
      {
        id: 'bond-001',
        title: 'Contrat Freelance Développement',
        status: 'active',
        amount: 5000,
        currency: 'EUR',
        clientName: 'Startup Tech',
        freelancerName: 'Dev Expert',
        milestones: [
          { id: 'm1', title: 'Phase 1: Analyse', amount: 1500, status: 'completed' },
          { id: 'm2', title: 'Phase 2: Développement', amount: 2000, status: 'pending' },
          { id: 'm3', title: 'Phase 3: Tests', amount: 1500, status: 'pending' }
        ],
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'bond-002',
        title: 'Contrat Services IT',
        status: 'pending',
        amount: 12000,
        currency: 'EUR',
        clientName: 'Entreprise ABC',
        freelancerName: 'Consultant IT',
        milestones: [
          { id: 'm1', title: 'Audit technique', amount: 3000, status: 'pending' },
          { id: 'm2', title: 'Implémentation', amount: 6000, status: 'pending' },
          { id: 'm3', title: 'Formation équipe', amount: 3000, status: 'pending' }
        ],
        createdAt: '2024-01-20T14:30:00Z'
      },
      {
        id: 'bond-003',
        title: 'Contrat Design Graphique',
        status: 'completed',
        amount: 3000,
        currency: 'EUR',
        clientName: 'Agence Marketing',
        freelancerName: 'Designer Pro',
        milestones: [
          { id: 'm1', title: 'Logo Design', amount: 1000, status: 'completed' },
          { id: 'm2', title: 'Charte Graphique', amount: 1500, status: 'completed' },
          { id: 'm3', title: 'Templates', amount: 500, status: 'completed' }
        ],
        createdAt: '2024-01-10T09:15:00Z'
      }
    ];

    return res.status(200).json({
      success: true,
      contracts,
      total: contracts.length,
      message: 'Bond contracts retrieved successfully'
    });
  }

  if (req.method === 'POST') {
    const { title, amount, clientName, freelancerName } = req.body;
    
    const newContract = {
      id: `bond-${Date.now()}`,
      title: title || 'Nouveau Contrat Bond',
      status: 'pending',
      amount: amount || 5000,
      currency: 'EUR',
      clientName: clientName || 'Client',
      freelancerName: freelancerName || 'Freelancer',
      milestones: [
        { id: 'm1', title: 'Phase 1', amount: Math.floor((amount || 5000) / 3), status: 'pending' },
        { id: 'm2', title: 'Phase 2', amount: Math.floor((amount || 5000) / 3), status: 'pending' },
        { id: 'm3', title: 'Phase 3', amount: Math.floor((amount || 5000) / 3), status: 'pending' }
      ],
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      contract: newContract,
      message: 'Bond contract created successfully'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
