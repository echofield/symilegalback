import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return mock Bond contracts for now
    const mockContracts = [
      {
        id: 'bond-001',
        title: 'Contrat de Prestation Freelance',
        status: 'active',
        amount: 5000,
        currency: 'EUR',
        milestones: [
          { id: 'm1', title: 'Phase 1: Analyse', amount: 1500, status: 'completed' },
          { id: 'm2', title: 'Phase 2: Développement', amount: 2000, status: 'pending' },
          { id: 'm3', title: 'Phase 3: Livraison', amount: 1500, status: 'pending' }
        ],
        createdAt: new Date().toISOString(),
        clientName: 'Client Demo',
        freelancerName: 'Freelancer Demo'
      },
      {
        id: 'bond-002', 
        title: 'Contrat de Services IT',
        status: 'pending',
        amount: 12000,
        currency: 'EUR',
        milestones: [
          { id: 'm1', title: 'Audit technique', amount: 3000, status: 'pending' },
          { id: 'm2', title: 'Implémentation', amount: 6000, status: 'pending' },
          { id: 'm3', title: 'Formation', amount: 3000, status: 'pending' }
        ],
        createdAt: new Date().toISOString(),
        clientName: 'Entreprise ABC',
        freelancerName: 'Consultant IT'
      }
    ];

    return res.status(200).json({
      success: true,
      contracts: mockContracts,
      total: mockContracts.length,
      message: 'Bond contracts retrieved successfully'
    });

  } catch (error: any) {
    console.error('Bond contracts error:', error);
    return res.status(500).json({
      error: true,
      message: 'Failed to retrieve Bond contracts',
      details: error.message
    });
  }
}

export default withCors(handler);