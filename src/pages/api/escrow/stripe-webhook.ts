import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import Stripe from 'stripe';
import { prisma } from '@/lib/supabase';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any;
      const contractId = pi.metadata?.contractId;
      if (contractId) {
        await prisma.escrowBatch.create({
          data: {
            contractId,
            amount: pi.amount_received ?? pi.amount,
            currency: pi.currency,
            paymentIntentId: pi.id,
            chargeId: pi.latest_charge ?? null,
          },
        });
      }
    }
  } catch (e: any) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  res.status(200).json({ received: true });
}


