import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, cabinetName, siret } = req.body as { email: string; cabinetName?: string; siret?: string };

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: 'price_cabinet_350', quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/cabinet/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      customer_email: email,
      metadata: { cabinetName, siret, plan: 'cabinet' },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to create checkout' });
  }
}


