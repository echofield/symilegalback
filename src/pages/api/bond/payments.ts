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
    const payments = [
      {
        id: 'payment-001',
        contractId: 'bond-001',
        milestoneId: 'milestone-001',
        amount: 1500,
        currency: 'EUR',
        status: 'completed',
        method: 'stripe',
        stripePaymentIntentId: 'pi_1234567890',
        createdAt: '2024-01-24T16:30:00Z',
        completedAt: '2024-01-24T16:35:00Z'
      },
      {
        id: 'payment-002',
        contractId: 'bond-001',
        milestoneId: 'milestone-002',
        amount: 2000,
        currency: 'EUR',
        status: 'pending',
        method: 'stripe',
        stripePaymentIntentId: null,
        createdAt: '2024-01-25T10:00:00Z',
        completedAt: null
      },
      {
        id: 'payment-003',
        contractId: 'bond-002',
        milestoneId: 'milestone-003',
        amount: 3000,
        currency: 'EUR',
        status: 'pending',
        method: 'stripe',
        stripePaymentIntentId: null,
        createdAt: '2024-01-26T14:00:00Z',
        completedAt: null
      }
    ];

    return res.status(200).json({
      success: true,
      payments,
      total: payments.length,
      message: 'Payments retrieved successfully'
    });
  }

  if (req.method === 'POST') {
    const { contractId, milestoneId, amount, method } = req.body;
    
    const newPayment = {
      id: `payment-${Date.now()}`,
      contractId: contractId || 'bond-001',
      milestoneId: milestoneId || 'milestone-001',
      amount: amount || 1000,
      currency: 'EUR',
      status: 'pending',
      method: method || 'stripe',
      stripePaymentIntentId: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    return res.status(201).json({
      success: true,
      payment: newPayment,
      message: 'Payment created successfully'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
