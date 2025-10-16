import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type AdvisorAction = {
  type: string;
  args: Record<string, unknown>;
};

type AdvisorSuccessResponse = {
  output: {
    reply_text: string;
    action: AdvisorAction;
  };
};

type AdvisorErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

type AdvisorRequestBody = {
  question?: unknown;
};

function parseRequestBody(body: NextApiRequest['body']): AdvisorRequestBody | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as AdvisorRequestBody;
    } catch (error) {
      if (isDev) {
        console.error('[advisor] Failed to parse JSON body', error);
      }
      return null;
    }
  }

  if (typeof body === 'object') {
    return body as AdvisorRequestBody;
  }

  return null;
}

function buildResponse(question: string): AdvisorSuccessResponse {
  const normalised = question.toLowerCase();

  if (normalised.includes('cdd') || normalised.includes('licenciement') || normalised.includes('rupture')) {
    const response: AdvisorSuccessResponse = {
      output: {
        reply_text: 'Vous pouvez utiliser le modèle de rupture de contrat de travail (CDD).',
        action: { type: 'suggest_contract', args: { topic: 'rupture CDD' } },
      },
    };

    if (isDev) {
      console.log('[advisor] Matched rupture keywords for question');
    }

    return response;
  }

  if (isDev) {
    console.log('[advisor] Using fallback response for question');
  }

  return {
    output: {
      reply_text: 'Je ne suis pas certain, mais vous pouvez consulter nos modèles de contrat.',
      action: { type: 'suggest_contract', args: { topic: 'general' } },
    },
  };
}

async function handler(
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

  const parsedBody = parseRequestBody(req.body);
  const question = parsedBody?.question;

  if (typeof question !== 'string' || question.trim().length === 0) {
    res.status(400).json({ error: true, message: 'Validation error' });
    return;
  }

  const response = buildResponse(question);
  res.status(200).json(response);
}

export default handler;
