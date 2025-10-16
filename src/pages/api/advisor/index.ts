import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type AdvisorSuccessResponse = {
  output: {
    thought: string;
    followup_question: string | null;
    action: { type: string; args: Record<string, unknown> };
    reply_text: string;
  };
};

type AdvisorErrorResponse = {
  error: true;
  message: string;
  code: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const RATE_LIMIT_LIMIT = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function setRateLimitHeaders(res: NextApiResponse, remaining = RATE_LIMIT_LIMIT) {
  const resetUnix = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SECONDS;
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, Math.min(remaining, RATE_LIMIT_LIMIT))));
  res.setHeader('X-RateLimit-Reset', String(resetUnix));
}

function parseBody(body: NextApiRequest['body']): Record<string, unknown> | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch (error) {
      if (isDev) {
        console.error('[advisor] failed to parse body', error);
      }
      return null;
    }
  }

  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }

  return null;
}

function determineTopic(question: string): { topic: string; reply: string } {
  const lowercase = question.toLowerCase();
  if (lowercase.includes('cdd') || lowercase.includes('contrat à durée déterminée')) {
    return {
      topic: 'rupture CDD',
      reply: 'Voici les options pour mettre fin à un contrat à durée déterminée. Vous pouvez utiliser notre modèle dédié.',
    };
  }

  if (lowercase.includes('licenciement')) {
    return {
      topic: 'licenciement',
      reply: 'Pour un licenciement, assurez-vous de respecter la procédure légale et consultez nos modèles adaptés.',
    };
  }

  if (lowercase.includes('rupture') || lowercase.includes('démission')) {
    return {
      topic: 'rupture de contrat',
      reply: 'Pour une rupture de contrat, choisissez le modèle correspondant et préparez les justificatifs nécessaires.',
    };
  }

  return {
    topic: 'general',
    reply: 'Je vous propose de consulter nos modèles principaux afin de trouver celui qui correspond à votre situation.',
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdvisorSuccessResponse | AdvisorErrorResponse>,
): Promise<void> {
  setCorsHeaders(res);
  setRateLimitHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: true, message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const parsed = parseBody(req.body);
    const question = parsed?.question;

    if (typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: true, message: 'Invalid question', code: 'INVALID_QUESTION' });
      return;
    }

    const trimmed = question.trim();
    const { topic, reply } = determineTopic(trimmed);

    if (isDev) {
      console.log('[advisor] responding with topic', topic);
    }

    const payload: AdvisorSuccessResponse = {
      output: {
        thought: `Analyzing user question regarding ${topic}.`,
        followup_question: null,
        action: { type: 'suggest_templates', args: { topic } },
        reply_text: reply,
      },
    };

    res.status(200).json(payload);
  } catch (error) {
    if (isDev) {
      console.error('[advisor] unexpected error', error);
    }

    res.status(500).json({ error: true, message: 'Server error', code: 'ADVISOR_ERROR' });
  }
}
