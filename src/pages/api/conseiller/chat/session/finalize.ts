import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { QUESTIONS_18 } from '@/lib/conseiller/questions';

type SessionData = { answers: Record<string, any>; order: string[]; createdAt: number };
const sessions: Map<string, SessionData> = (global as any).__SYMI_CHAT_SESSIONS__ || new Map();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const prompt = `Tu es un conseiller juridique français. À partir des réponses structurées ci-dessous, produis une analyse JSON courte avec:
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

  return res.status(200).json({
    success: true,
    analysis: audit,
    answers,
  });
}


