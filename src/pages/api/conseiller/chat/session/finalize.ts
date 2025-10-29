import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { QUESTIONS_18 } from '@/lib/conseiller/questions';

type SessionData = { answers: Record<string, any>; order: string[]; createdAt: number };
const sessions: Map<string, SessionData> = (global as any).__SYMI_CHAT_SESSIONS__ || new Map();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { sessionId, answers: directAnswers } = req.body || {};
  const s = sessionId ? sessions.get(sessionId) : null;
  const answers = (s?.answers) || directAnswers || {};
  if (!answers) return res.status(400).json({ error: 'No answers' });

  const TIMEOUT_MS = 8000;
  const start = Date.now();
  function remaining() { return Math.max(500, TIMEOUT_MS - (Date.now() - start)); }

  let audit: any = null;
  try {
    const prompt = `Tu es un conseiller juridique français. À partir des réponses structurées ci-dessous, produis une analyse JSON courte avec DES CHAMPS NON VIDES. Réponds UNIQUEMENT avec ce JSON:
{
  "summary": string,
  "category": string,
  "urgency": number,
  "complexity": "Faible|Moyenne|Élevée",
  "risks": string[],
  "actions": string[],
  "needsLawyer": boolean,
  "lawyerSpecialty": string | null,
  "recommendedTemplateId": string | null
}
Réponses: ${JSON.stringify(answers).slice(0, 4000)}`;
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), remaining()))
    ]) as any;
    const raw = completion.choices?.[0]?.message?.content || '{}';
    audit = JSON.parse(raw);
  } catch {
    audit = {
      summary: String(answers.situation || '').slice(0, 240),
      category: answers.category || 'Droit général',
      urgency: Number(answers.urgency || 5),
      complexity: 'Moyenne',
      risks: [],
      actions: ['Rassembler les documents', 'Lister les dates clés'],
      needsLawyer: false,
      lawyerSpecialty: null,
      recommendedTemplateId: null,
    };
  }

  // Coalesce defaults to guarantee non-empty fields
  audit = audit || {};
  const cat = audit.category || answers.category || 'Droit général';
  const urg = Number(audit.urgency ?? answers.urgency ?? 5) || 5;
  audit.summary = typeof audit.summary === 'string' && audit.summary.trim().length
    ? audit.summary
    : (answers.situation ? String(answers.situation).slice(0, 280) : `Affaire ${cat}`);
  audit.category = cat;
  audit.urgency = urg;
  audit.complexity = ['Faible', 'Moyenne', 'Élevée'].includes(audit.complexity) ? audit.complexity : (urg >= 7 ? 'Élevée' : 'Moyenne');
  audit.risks = Array.isArray(audit.risks) && audit.risks.length ? audit.risks : ['Risque de prescription', 'Insuffisance de preuves'];
  audit.actions = Array.isArray(audit.actions) && audit.actions.length ? audit.actions : [
    'Rassembler les documents (contrats, échanges, preuves)',
    'Établir une chronologie des faits',
    'Envisager une mise en demeure ou consulter un avocat'
  ];
  audit.needsLawyer = typeof audit.needsLawyer === 'boolean' ? audit.needsLawyer : (urg >= 7 || audit.complexity === 'Élevée');
  audit.lawyerSpecialty = audit.lawyerSpecialty || (cat.toLowerCase().includes('travail') ? 'Travail' : cat.toLowerCase().includes('immobilier') ? 'Immobilier' : null);
  if (!audit.recommendedTemplateId) {
    const lc = cat.toLowerCase();
    audit.recommendedTemplateId = lc.includes('travail') ? 'contestation-licenciement'
      : lc.includes('immobilier') ? 'mise-en-demeure-bailleur'
      : lc.includes('consommation') ? 'reclamation-consommateur'
      : 'mise-en-demeure-generale';
  }

  return res.status(200).json({
    success: true,
    analysis: audit,
    answers,
  });
}


