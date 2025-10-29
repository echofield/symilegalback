import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

/**
 * /api/conseiller/session - Manage chat sessions
 * 
 * Methods:
 * - GET: Retrieve session data
 * - DELETE: Clear session (reset conversation)
 */

interface SessionData {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, string>;
  questionCount: number;
}

const sessions = (global as any).__SYMI_CHAT_SESSIONS__ || new Map<string, SessionData>();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

const GetSchema = z.object({
  sessionId: z.string().min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { sessionId } = GetSchema.parse(req.query);
      const sessionData = sessions.get(sessionId);

      if (!sessionData) {
        return res.status(404).json({
          error: true,
          message: 'Session not found',
        });
      }

      return res.status(200).json({
        success: true,
        session: {
          id: sessionId,
          messages: sessionData.messages,
          context: sessionData.context,
          questionCount: sessionData.questionCount,
        },
      });
    } else if (req.method === 'DELETE') {
      const { sessionId } = GetSchema.parse(req.query);
      const existed = sessions.has(sessionId);
      sessions.delete(sessionId);

      return res.status(200).json({
        success: true,
        message: existed ? 'Session deleted' : 'Session not found (already deleted)',
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[session] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        details: error.errors,
      });
    }
    return res.status(500).json({
      error: true,
      message: error.message || 'Internal server error',
    });
  }
}

export default handler;

