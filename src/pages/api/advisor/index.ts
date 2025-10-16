import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type AdvisorSuccessResponse = {
  error: false;
  answer: string;
  suggestions: string[];
  relatedTopics: string[];
  confidence: number;
};

type AdvisorErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
        console.error('[advisor] Failed to parse body', error);
      }
      return null;
    }
  }

  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdvisorSuccessResponse | AdvisorErrorResponse>,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: true, message: 'Method not allowed' });
    return;
  }

  try {
    const parsed = parseBody(req.body);
    const question = parsed?.question;

    if (typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({ error: true, message: 'Invalid question' });
      return;
    }

    const trimmedQuestion = question.trim();
    const focus = trimmedQuestion.toLowerCase();
    const keyword = focus.includes('licenciement')
      ? 'licenciement'
      : focus.includes('cdd')
      ? 'contrats à durée déterminée'
      : focus.includes('rupture')
      ? 'rupture de contrat'
      : trimmedQuestion;

    const response: AdvisorSuccessResponse = {
      error: false,
      answer: `Based on your question about ${keyword}, voici les prochaines étapes recommandées.`,
      suggestions: [
        'Consultez les obligations légales applicables à votre situation.',
        'Préparez les documents nécessaires avant de lancer vos démarches.',
        "Planifiez un rendez-vous avec un spécialiste pour valider votre stratégie.",
      ],
      relatedTopics: ['Contract Law', 'Employment Law'],
      confidence: 0.83,
    };

    if (isDev) {
      console.log('[advisor] Responding to question', trimmedQuestion);
    }

    res.status(200).json(response);
  } catch (error) {
    if (isDev) {
      console.error('[advisor] Unexpected error', error);
    }

    res.status(500).json({ error: true, message: 'Server error' });
  }
}
