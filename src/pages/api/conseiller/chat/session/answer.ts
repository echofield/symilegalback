import type { NextApiRequest, NextApiResponse } from 'next';
import { QUESTIONS_18, getNextQuestionId, getQuestionById } from '@/lib/conseiller/questions';

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

  const { sessionId, questionId, answer } = req.body || {};
  if (!sessionId || !questionId) return res.status(400).json({ error: 'Missing sessionId or questionId' });

  let s = sessions.get(sessionId);
  if (!s) {
    // Auto-initialize session to avoid 404 on rapid answer before start
    s = { answers: {}, order: QUESTIONS_18.map(q => q.id), createdAt: Date.now() };
    sessions.set(sessionId, s);
  }

  // Store answer
  s.answers[questionId] = answer;

  // Determine next
  const nextId = getNextQuestionId(s.answers);
  const idxAnswered = Object.keys(s.answers).length;
  const nextQuestion = nextId ? getQuestionById(nextId) : null;

  return res.status(200).json({
    sessionId,
    nextQuestion,
    progress: { answered: Math.min(idxAnswered, QUESTIONS_18.length), total: QUESTIONS_18.length },
    answers: s.answers,
    isComplete: !nextQuestion,
  });
}


