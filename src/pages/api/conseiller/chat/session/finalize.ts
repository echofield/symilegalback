import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { QUESTIONS_18 } from '@/lib/conseiller/questions';
import { parseJsonLoose, coalesceAuditDefaultsV2 } from '@/lib/auditV2';

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
    const useV2 = String(process.env.LEGAL_AUDIT_V2 || 'true') === 'true';
    if (useV2) {
      const SYSTEM_PROMPT = `Tu es Maître Analyse — expert en diagnostic juridique stratégique.
Réponds UNIQUEMENT en JSON valide selon le schéma ci-dessous, sans texte hors JSON.
Schéma:
{
  "diagnostic": {
    "probleme_principal": "...",
    "schema_recurrent": "...",
    "risque_critique": "...",
    "niveau_urgence": "Critique|Élevé|Modéré|Faible"
  },
  "analyse_strategique": "...",
  "pieges_juridiques": ["..."],
  "predictions_echec": ["..."],
  "recommandation_choc": "...",
  "protocole_solution": { "nom": "...", "mécanisme": "...", "jalons": "...", "metriques_succes": "..." },
  "risk_matrix": { "severity": "Faible|Moyen|Élevé", "urgency": 1, "proof_strength": "Faible|Moyen|Élevé", "main_risks": ["..."] },
  "estimated_costs": { "amiable": "€min-€max", "judiciaire": "€min-€max" },
  "prognosis_if_no_action": "...",
  "next_critical_step": "...",
  "summary": "≤4 phrases",
  "category": "...",
  "urgency": 5,
  "complexity": "Faible|Moyenne|Élevée",
  "actions": ["..."],
  "needsLawyer": true,
  "lawyerSpecialty": "...",
  "recommendedTemplateId": "...|null"
}`;
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), remaining());
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Réponses:\n${JSON.stringify(answers).slice(0,4000)}` }
          ]
        })
      });
      clearTimeout(to);
      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content || '{}';
      const parsed = parseJsonLoose(content);
      audit = coalesceAuditDefaultsV2(parsed, answers);
    } else {
      // Legacy minimal prompt
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 500,
          messages: [{ role: 'user', content: `Analyse en JSON des réponses: ${JSON.stringify(answers).slice(0, 4000)}` }],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), remaining()))
      ]) as any;
      const raw = completion.choices?.[0]?.message?.content || '{}';
      const parsed = parseJsonLoose(raw);
      audit = coalesceAuditDefaultsV2(parsed, answers);
    }
  } catch {
    audit = coalesceAuditDefaultsV2({}, answers);
  }

  return res.status(200).json({
    success: true,
    analysis: audit,
    answers,
  });
}


