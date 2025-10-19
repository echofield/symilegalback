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
    const milestones = [
      {
        id: 'milestone-001',
        contractId: 'bond-001',
        title: 'Phase 1: Analyse des besoins',
        description: 'Analyse complète des besoins du client',
        amount: 1500,
        currency: 'EUR',
        status: 'completed',
        dueDate: '2024-01-25T00:00:00Z',
        completedAt: '2024-01-24T16:30:00Z',
        proof: 'Rapport d\'analyse de 15 pages'
      },
      {
        id: 'milestone-002',
        contractId: 'bond-001',
        title: 'Phase 2: Développement',
        description: 'Développement de la solution',
        amount: 2000,
        currency: 'EUR',
        status: 'pending',
        dueDate: '2024-02-15T00:00:00Z',
        completedAt: null,
        proof: null
      },
      {
        id: 'milestone-003',
        contractId: 'bond-002',
        title: 'Audit technique',
        description: 'Audit complet de l\'infrastructure',
        amount: 3000,
        currency: 'EUR',
        status: 'pending',
        dueDate: '2024-02-20T00:00:00Z',
        completedAt: null,
        proof: null
      }
    ];

    return res.status(200).json({
      success: true,
      milestones,
      total: milestones.length,
      message: 'Milestones retrieved successfully'
    });
  }

  if (req.method === 'POST') {
    const { contractId, title, description, amount, dueDate } = req.body;
    
    const newMilestone = {
      id: `milestone-${Date.now()}`,
      contractId: contractId || 'bond-001',
      title: title || 'Nouveau Milestone',
      description: description || 'Description du milestone',
      amount: amount || 1000,
      currency: 'EUR',
      status: 'pending',
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      proof: null
    };

    return res.status(201).json({
      success: true,
      milestone: newMilestone,
      message: 'Milestone created successfully'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
