import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type AdvisorAction = {
  type: string;
  args: Record<string, unknown>;
};

type AdvisorOutput = {
  reply_text: string;
  action: AdvisorAction;
};

type AdvisorResponse = {
  output: AdvisorOutput;
};

const KEYWORDS = [/licenciement/i, /cdd/i, /rupture/i];
const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildResponse(question: string): AdvisorResponse {
  const matchesKeyword = KEYWORDS.some((regex) => regex.test(question));

  if (matchesKeyword) {
    return {
      output: {
        reply_text: 'Vous pouvez utiliser le modèle de rupture de contrat de travail (CDD).',
        action: { type: 'suggest_contract', args: { topic: 'rupture CDD' } },
      },
    };
  }

  return {
    output: {
      reply_text: "Je ne suis pas certain, mais je peux vous aider à explorer nos modèles de documents.",
      action: { type: 'suggest_contract', args: { topic: 'general' } },
    },
  };
}

function parseRequestBody(body: unknown): { question?: string } {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const { question } = body as Record<string, unknown>;

  return {
    question: typeof question === 'string' ? question.trim() : undefined,
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdvisorResponse | { error: string }>,
) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    setCorsHeaders(res);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question } = parseRequestBody(req.body);

    if (!question) {
      setCorsHeaders(res);
      return res.status(400).json({ error: 'Missing or invalid question' });
    }

    if (isDev) {
      console.log('[advisor] Question received', question);
    }

    const response = buildResponse(question);
    setCorsHeaders(res);

    return res.status(200).json(response);
  } catch (error) {
    if (isDev) {
      console.error('[advisor] Failed to process request', error);
    }

    setCorsHeaders(res);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
