import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { withCors } from '@/lib/http/cors';

export const runtime = 'nodejs';

export default withCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: true, message: 'Stripe not configured' });

  const stripe = new Stripe(secret, { apiVersion: '2025-09-30.clover' as any });

  try {
    const { templateId, price, inputs } = (req.body || {}) as { templateId?: string; price?: number; inputs?: Record<string, any> };
    if (!templateId || !price || !inputs) {
      return res.status(400).json({ error: true, message: 'Missing params' });
    }

    const origin = (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host'])
      ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
      : (req.headers.origin as string | undefined);
    const publicUrl = process.env.PUBLIC_WEB_URL || origin || 'https://www.symione.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Contrat: ${templateId}` },
          unit_amount: Math.round(Number(price) * 100),
        },
        quantity: 1,
      }],
      success_url: `${publicUrl}/?success=1&template=${encodeURIComponent(templateId)}`,
      cancel_url: `${publicUrl}/modeles`,
      metadata: {
        type: 'document',
        templateId,
        inputs: JSON.stringify(inputs || {}),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err?.message || 'Checkout creation failed' });
  }
});


