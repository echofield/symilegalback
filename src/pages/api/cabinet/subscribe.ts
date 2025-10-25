import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

import { CABINET_PRICING } from '@/config/pricing';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-09-30.clover' })
  : null;

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

type SubscribeBody = {
  email?: string;
  cabinetName?: string;
  siret?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe configuration missing' });
  }

  const { email, cabinetName, siret } = req.body as SubscribeBody;

  if (!email || !cabinetName || !siret) {
    return res.status(400).json({ error: 'email, cabinetName and siret are required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: CABINET_PRICING.stripe_price_id,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${frontendUrl}/cabinet/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing`,
      customer_email: email,
      metadata: {
        cabinetName,
        siret,
        plan: 'cabinet'
      }
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe session missing redirect URL' });
    }

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'Unable to create checkout session' });
  }
}

// Webhook handler (après paiement):
// → Envoie email avec:
//    - Lien rapport BODACC hebdo
//    - Token API pour référencement prioritaire
//    - Contact support prioritaire
// → Pas de création compte user
