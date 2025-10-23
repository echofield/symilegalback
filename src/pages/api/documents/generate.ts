import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { DOCUMENTS_PRICING } from '@/config/pricing';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const frontendUrl = process.env.FRONTEND_URL || process.env.URL;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe n\'est pas configuré côté serveur.' });
  }

  if (!frontendUrl) {
    return res.status(500).json({ error: 'FRONTEND_URL must be configured' });
  }

  try {
    const { documentType, formData, userEmail } = req.body as {
      documentType?: string;
      formData?: unknown;
      userEmail?: string;
    };

    if (!documentType) {
      return res.status(400).json({ error: 'Le type de document est requis.' });
    }

    const documentConfig = DOCUMENTS_PRICING[documentType];

    if (!documentConfig) {
      return res.status(400).json({ error: 'Document type invalide' });
    }

    if (!userEmail) {
      return res.status(400).json({ error: "L'email utilisateur est requis." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: documentConfig.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/documents/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/documents/cancelled`,
      customer_email: userEmail,
      metadata: {
        documentType: documentConfig.id,
        formData: JSON.stringify(formData ?? {}),
      },
    });

    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue';
    return res.status(500).json({ error: message });
  }
}
