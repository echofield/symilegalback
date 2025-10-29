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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.query as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });

  const nextId = getNextQuestionId(s.answers);
  const nextQuestion = nextId ? getQuestionById(nextId) : null;
  return res.status(200).json({
    sessionId,
    answers: s.answers,
    nextQuestion,
    progress: { answered: Object.keys(s.answers).length, total: QUESTIONS_18.length },
  });
}


