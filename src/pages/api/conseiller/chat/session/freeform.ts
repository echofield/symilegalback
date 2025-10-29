import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { INTERPRETER_MAP, getNextQuestionId, getQuestionById, QUESTIONS_18 } from '@/lib/conseiller/questions';

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
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message) return res.status(400).json({ error: 'Missing sessionId or message' });
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });

  // Quick heuristic pass
  const lower = String(message).toLowerCase();
  for (const key of Object.keys(INTERPRETER_MAP)) {
    if (lower.includes(key) && !s.answers[INTERPRETER_MAP[key]]) {
      s.answers[INTERPRETER_MAP[key]] = message;
    }
  }

  // Small LLM pass with strict limits (1s budget)
  try {
    const prompt = `Tu extrais des champs structurés si présents. Réponds STRICTEMENT en JSON { city?: string, urgency?: number, budget?: number, amount?: number, category?: string } sans texte.
Texte: ${message}`;
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise(resolve => setTimeout(() => resolve({ choices: [{ message: { content: '{}' } }] } as any), 1000))
    ]) as any;
    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const mapping: Record<string, string> = { city: 'city', urgency: 'urgency', budget: 'budget', amount: 'amount', category: 'category' };
    for (const k of Object.keys(mapping)) {
      if (typeof parsed[k] !== 'undefined' && !s.answers[mapping[k]]) {
        s.answers[mapping[k]] = parsed[k];
      }
    }
  } catch {}

  const nextId = getNextQuestionId(s.answers);
  const nextQuestion = nextId ? getQuestionById(nextId) : null;
  return res.status(200).json({
    sessionId,
    answers: s.answers,
    nextQuestion,
    progress: { answered: Object.keys(s.answers).length, total: QUESTIONS_18.length },
  });
}


