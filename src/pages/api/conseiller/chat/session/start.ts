import type { NextApiRequest, NextApiResponse } from 'next';
import { QUESTIONS_18, getQuestionById } from '@/lib/conseiller/questions';

type SessionData = {
  answers: Record<string, any>;
  order: string[];
  createdAt: number;
};

const sessions: Map<string, SessionData> = (global as any).__SYMI_CHAT_SESSIONS__ || new Map();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body || {};
  const id = sessionId || Math.random().toString(36).slice(2, 10);

  const existing = sessions.get(id);
  if (!existing) {
    sessions.set(id, { answers: {}, order: QUESTIONS_18.map(q => q.id), createdAt: Date.now() });
  }

  const q = QUESTIONS_18[0];
  return res.status(200).json({
    sessionId: id,
    nextQuestion: q,
    progress: { answered: 0, total: QUESTIONS_18.length },
  });
}


