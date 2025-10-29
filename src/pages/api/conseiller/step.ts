import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';

// In-memory context shared across routes (for POC). In prod: KV/DB/Redis.
const contexts = (global as any).__SYMI_CONTEXT__ || new Map<string, Record<string, string>>();
(global as any).__SYMI_CONTEXT__ = contexts;

type Question = {
  id: string;
  type: 'text' | 'select' | 'radio' | 'amount';
  label: string;
  subtext?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const QUESTIONS: Question[] = [
  { id: 'q1', type: 'text', label: 'Décrivez brièvement votre situation', placeholder: 'Faits, dates clés, montants…' },
  { id: 'q2', type: 'select', label: 'Catégorie juridique principale', options: [
      { value: 'immobilier', label: 'Immobilier' },
      { value: 'travail', label: 'Travail' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'consommation', label: 'Consommation' },
      { value: 'famille', label: 'Famille' },
      { value: 'autre', label: 'Autre' },
    ] },
  { id: 'q3', type: 'radio', label: "Niveau d'urgence", options: [
      { value: '10', label: 'Très urgent (48h)' },
      { value: '7', label: 'Urgent (semaine)' },
      { value: '5', label: 'Moyen (mois)' },
      { value: '3', label: 'Préventif' },
    ] },
  { id: 'q4', type: 'text', label: 'Parties impliquées', placeholder: 'Vous / autre partie (entreprise, personne…)' },
  { id: 'q5', type: 'amount', label: 'Montant en jeu (si applicable)' },
  { id: 'q6', type: 'text', label: 'Pièces/preuves disponibles', placeholder: 'Contrat, emails, photos…' },
  { id: 'q7', type: 'text', label: 'Ville (pour avocats)', placeholder: 'Ex: Paris' },
  { id: 'q8', type: 'text', label: 'Objectif principal', placeholder: 'Ce que vous souhaitez obtenir' },
  { id: 'q9', type: 'text', label: 'Démarches déjà réalisées', placeholder: 'Mise en demeure, médiation…' },
  { id: 'q10', type: 'text', label: 'Délais/échéances connus', placeholder: 'Dates butoirs, prescription…' },
  { id: 'q11', type: 'text', label: 'Clauses/contrats concernés', placeholder: 'Articles, clauses clés…' },
  { id: 'q12', type: 'text', label: 'Risques perçus', placeholder: 'Points sensibles' },
  { id: 'q13', type: 'text', label: 'Forces du dossier', placeholder: 'Atouts concrets' },
  { id: 'q14', type: 'text', label: 'Contraintes/budget', placeholder: 'Temps, argent, disponibilité' },
  { id: 'q15', type: 'text', label: 'Contexte complémentaire' },
  { id: 'q16', type: 'text', label: 'Autre information utile' },
  { id: 'q17', type: 'text', label: 'Votre préférence de stratégie', placeholder: 'Amiable / contentieux / autre' },
  { id: 'q18', type: 'text', label: 'Langue/contraintes particulières' },
];

function getNextQuestion(currentId?: string): Question {
  if (!currentId) return QUESTIONS[0];
  const idx = QUESTIONS.findIndex(q => q.id === currentId);
  return QUESTIONS[idx + 1] || QUESTIONS[QUESTIONS.length - 1];
}

function partialFromAnswers(a: Record<string, string>) {
  const summary = a.q1 ? a.q1.slice(0, 220) : undefined;
  const strengths = [a.q13].filter(Boolean) as string[];
  const weaknesses = [a.q12].filter(Boolean) as string[];
  const immediateSteps = a.q6 || a.q9 ? ['Rassembler les pièces', 'Documenter chronologie', 'Évaluer mise en demeure'] : [];
  return { summary, strengths, weaknesses, immediateSteps };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { contextId, questionId, answer } = req.body || {};

  const id = contextId || Math.random().toString(36).slice(2, 10);
  const existing = contexts.get(id) || {};
  if (questionId) existing[questionId] = String(answer ?? '');
  contexts.set(id, existing);

  const nextQ = getNextQuestion(questionId);
  const partial = partialFromAnswers(existing);

  return res.status(200).json({ contextId: id, nextQuestion: nextQ, partialAnalysis: partial });
}

export default withCors(handler);

export const runtime = 'nodejs';


