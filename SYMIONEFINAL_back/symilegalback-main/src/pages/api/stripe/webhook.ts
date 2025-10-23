import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  // Placeholder webhook receiver - to be replaced when Stripe is configured
  try {
    // In production, read raw body and verify signature, then handle events
    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err?.message || 'Webhook error' });
  }
}


