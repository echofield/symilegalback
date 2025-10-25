import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  try {
    // Placeholder: integrate Stripe when keys are provided
    const { plan, userId } = req.body as { plan: 'pro' | 'cabinet'; userId: string };
    if (!plan || !userId) return res.status(400).json({ error: true, message: 'plan and userId are required' });
    // Simulate session URL
    return res.status(200).json({ url: `${process.env.URL || 'http://localhost:3000'}/success` });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err?.message || 'Failed to create checkout' });
  }
}


