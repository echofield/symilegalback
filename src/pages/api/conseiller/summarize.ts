import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';

// Shared with step.ts (simple Map en mémoire pour POC)
const contexts = (global as any).__SYMI_CONTEXT__ || new Map<string, Record<string, string>>();
(global as any).__SYMI_CONTEXT__ = contexts;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { contextId, answers } = req.body || {};
  let a: Record<string, string> | undefined = contexts.get(contextId);
  // Fallback: accept answers directly from client if in-memory context is not available (serverless cold start)
  if (!a && answers && typeof answers === 'object') {
    a = answers as Record<string, string>;
  }
  if (!a) return res.status(200).json({ success: false, error: 'Contexte introuvable' });

  // Fast summary (court) < 8s – ici simplifié sans appel IA pour stabiliser
  const summary = a.q1 ? a.q1.slice(0, 500) : 'Résumé en cours…';
  const strengths = [a.q13].filter(Boolean) as string[];
  const weaknesses = [a.q12].filter(Boolean) as string[];
  const immediateSteps = ['Lister les pièces', 'Fixer un objectif précis', 'Préparer une mise en demeure si pertinent'];

  const analysis = {
    resume: summary,
    analyse: { forcesdossier: strengths, faiblesses: weaknesses, preuvesAConstituer: [] },
    planAction: { immediat: immediateSteps.map(s => ({ action: s, cout: '—', duree: '—', objectif: '—' })), courtTerme: [], moyenTerme: [], alternatives: [] },
    estimationFinanciere: { amiable: { cout: '€300-1200', duree: '2-8 semaines', details: [] }, judiciaire: { cout: '€2000-6000', duree: '6-18 mois', details: [] }, aideJuridictionnelle: 'Sous conditions' },
    scoring: { urgenceIA: Number(a.q3 || 5), complexite: 'Moyenne', pronosticReussite: 60 },
    recommandation: { strategiePrincipale: 'Tenter un règlement amiable rapide', prochaineEtapeCritique: 'Constituer un dossier de preuves' },
    templates: [],
  };

  return res.status(200).json({ success: true, analysis });
}

export default withCors(handler);

export const runtime = 'nodejs';


