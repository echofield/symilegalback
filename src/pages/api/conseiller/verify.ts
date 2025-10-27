import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';

const QuerySchema = z.object({
  session_id: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query as { session_id: string };

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  // TESTING MODE - Return mock analysis
  if (process.env.TESTING_MODE === 'true') {
    console.log('[VERIFY] Testing mode - returning mock analysis');
    
    // Import the analysis function
    const { default: callOpenAIAudit } = await import('../conseiller/analyze');
    
    // Return a mock enhanced analysis
    return res.status(200).json({
      success: true,
      paid: true,
      analysis: {
        resume: "Analyse complète disponible après paiement",
        qualificationJuridique: {
          fondementLegal: ["Article 1240 du Code Civil"],
          jurisprudence: ["Cass. 2e civ., 2024"],
          doctrine: "Position majoritaire favorable"
        },
        analyse: {
          forcesdossier: ["Point fort 1", "Point fort 2"],
          faiblesses: ["Risque 1", "Risque 2"],
          preuvesAConstituer: []
        },
        planAction: {
          immediat: [],
          courtTerme: [],
          moyenTerme: [],
          alternatives: []
        },
        estimationFinanciere: {
          amiable: { cout: "€355-800", duree: "2-8 semaines" },
          judiciaire: { cout: "€2150-6000", duree: "6-18 mois" }
        },
        scoring: {
          urgenceIA: 7,
          complexite: "Moyenne",
          pronosticReussite: 75
        },
        recommandation: {
          strategiePrincipale: "Tentative amiable recommandée",
          prochaineEtapeCritique: "Envoyer lettre recommandée"
        }
      }
    });
  }

  // PRODUCTION MODE - Verify real Stripe session
  /*
  // TODO: Uncomment when Stripe is ready
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ 
        error: 'Payment required',
        payment_status: session.payment_status 
      });
    }

    // Extract metadata
    const { problem, city, category, urgency, hasEvidence } = session.metadata;

    // Call the enhanced analysis function
    const { default: callOpenAIAudit } = await import('../conseiller/analyze');
    
    const analysis = await callOpenAIAudit({
      description: problem,
      category: category || 'Non spécifié',
      urgency: parseInt(urgency) || 5,
      hasEvidence: hasEvidence === 'true',
      city
    });

    return res.status(200).json({
      success: true,
      paid: true,
      analysis,
      session_id,
      payment_amount: session.amount_total,
      payment_currency: session.currency,
      customer_email: session.customer_details?.email
    });

  } catch (error: any) {
    console.error('[VERIFY] Session verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  */

  // Temporary response while Stripe is not configured
  return res.status(501).json({ 
    error: 'Payment verification not yet available',
    message: 'Stripe integration coming soon'
  });
}

export default withCors(handler);
