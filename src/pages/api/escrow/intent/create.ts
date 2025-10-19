import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const schema = z.object({
  contractId: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().min(3),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true });

  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: true, message: 'Invalid payload' });

  const { contractId, amount, currency } = body.data;
  const pi = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: { contractId },
  });
  res.status(200).json({ clientSecret: pi.client_secret });
}


