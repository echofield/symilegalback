import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';

const RequestSchema = z.object({
  problem: z.string(),
  city: z.string().optional(),
  category: z.string().optional(),
  urgency: z.number().optional(),
  hasEvidence: z.boolean().optional(),
});

const ResponseSchema = z.object({
  url: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { problem, city, category, urgency, hasEvidence } = req.body;

  // TESTING MODE - Return mock URL
  if (process.env.TESTING_MODE === 'true') {
    console.log('[STRIPE] Testing mode - returning mock checkout URL');
    return res.status(200).json({
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/conseiller/success?session_id=cs_test_mock_${Date.now()}`
    });
  }

  // PRODUCTION MODE - Create real Stripe session
  /* 
  // TODO: Uncomment when Stripe is ready
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Conseil juridique — Analyse détaillée',
            description: 'Analyse juridique complète de votre situation avec recommandations personnalisées',
          },
          unit_amount: 2900, // 29€ in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/conseiller/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/conseiller`,
      metadata: {
        problem: problem.substring(0, 500), // Stripe has metadata limits
        city: city || '',
        category: category || '',
        urgency: String(urgency || 5),
        hasEvidence: String(hasEvidence || false),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('[STRIPE] Checkout session error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  */

  // Temporary response while Stripe is not configured
  return res.status(501).json({ 
    error: 'Payment processing not yet available',
    message: 'Stripe integration coming soon'
  });
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));
