import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateDocument } from '@/services/documents';
import { sendDocumentEmail } from '@/services/email';

export const config = { api: { bodyParser: false } };

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  if (!stripe || !webhookSecret) {
    return res.status(500).json({ error: true, message: 'Stripe webhook non configuré.' });
  }

  let event: Stripe.Event;
  const signature = req.headers['stripe-signature'];

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err);
    return res.status(400).json({ error: true, message: err?.message || 'Webhook signature failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        console.error('Payment failed:', event.data.object);
        break;
      }
      default: {
        // Ignore unrelated events
        break;
      }
    }
  } catch (err: any) {
    console.error('Error while handling Stripe event', err);
    return res.status(500).json({ error: true, message: err?.message || 'Webhook processing error' });
  }

  return res.status(200).json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const documentType = metadata.documentType;
  const rawFormData = metadata.formData;

  if (!documentType) {
    console.warn('Checkout session completed without document type metadata', session.id);
    return;
  }

  let parsedFormData: Record<string, unknown> = {};
  if (rawFormData) {
    try {
      parsedFormData = JSON.parse(rawFormData);
    } catch (err) {
      console.warn('Impossible de parser le formData du document', err);
    }
  }

  const pdfUrl = await generateDocument(documentType, parsedFormData);

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (customerEmail) {
    await sendDocumentEmail(customerEmail, pdfUrl, documentType);
  } else {
    console.warn('Checkout session completed without customer email', session.id);
  }

  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  await prisma.transaction.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      documentType,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      customerEmail: customerEmail ?? 'unknown',
      pdfUrl,
      stripePaymentIntent: paymentIntentId ?? undefined,
      status: session.payment_status ?? 'completed',
    },
    update: {
      documentType,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      customerEmail: customerEmail ?? 'unknown',
      pdfUrl,
      stripePaymentIntent: paymentIntentId ?? undefined,
      status: session.payment_status ?? 'completed',
    },
  });
}
