import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type Lawyer = {
  id: string;
  name: string;
  firm: string;
  address: string;
  practiceAreas: string[];
  rating: number;
  yearsExperience: number;
  hourlyRate: number;
  lat: number;
  lng: number;
  place_id: string;
};

type LawyersSuccessResponse = {
  lawyers: Lawyer[];
  total: number;
  timestamp: string;
};

type LawyersErrorResponse = {
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
        console.error('[lawyers] failed to parse body', error);
      }
      return null;
    }
  }

  if (typeof body === 'object') {
    return body as Record<string, unknown>;
  }

  return null;
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

const FIRMS = [
  'Cabinet Dupont & Associés',
  'Étude Lemoine',
  'Cabinet Rousseau',
  'Juridica Conseil',
  'Lex & Partners',
  'Alliance Avocats',
  'Cabinet Monet',
  'Groupe Thémis',
  'Cabinet Valois',
  'Justitia Groupe',
];

const PRACTICES = [
  'Employment Law',
  'Contract Law',
  'Corporate Law',
  'Labour Relations',
  'Litigation',
  'Compliance',
];

function getPracticeAreas(): string[] {
  return [...PRACTICES].sort(() => Math.random() - 0.5).slice(0, 3);
}

function buildMockLawyers(query: string, lat: number, lng: number): Lawyer[] {
  const count = 5 + Math.floor(Math.random() * 6);
  const offset = 0.05;

  return Array.from({ length: count }).map((_, index) => {
    const firm = FIRMS[index % FIRMS.length];
    const latOffset = (Math.random() * 2 - 1) * offset;
    const lngOffset = (Math.random() * 2 - 1) * offset;
    const rating = Number.parseFloat((4.2 + Math.random() * 0.7).toFixed(1));
    const yearsExperience = 5 + Math.floor(Math.random() * 21);
    const hourlyRate = 150 + Math.floor(Math.random() * 101);

    return {
      id: `lawyer-${index + 1}`,
      name: `${firm.split(' ')[0]} ${index + 1}`,
      firm,
      address: `${Math.floor(5 + Math.random() * 50)} Rue de la Loi, ${query}`,
      practiceAreas: getPracticeAreas(),
      rating,
      yearsExperience,
      hourlyRate,
      lat: Number.parseFloat((lat + latOffset).toFixed(6)),
      lng: Number.parseFloat((lng + lngOffset).toFixed(6)),
      place_id: `mock-place-${index + 1}`,
    };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LawyersSuccessResponse | LawyersErrorResponse>,
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
    const query = parsed?.query;
    const lat = parseCoordinate(parsed?.lat ?? null);
    const lng = parseCoordinate(parsed?.lng ?? null);

    if (typeof query !== 'string' || query.trim().length === 0 || lat === null || lng === null) {
      res.status(400).json({ error: true, message: 'Validation error', code: 'INVALID_REQUEST' });
      return;
    }

    const lawyers = buildMockLawyers(query.trim(), lat, lng);

    if (isDev) {
      console.log('[lawyers] generated', lawyers.length, 'results for query', query);
    }

    const payload: LawyersSuccessResponse = {
      lawyers,
      total: lawyers.length,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(payload);
  } catch (error) {
    if (isDev) {
      console.error('[lawyers] unexpected error', error);
    }

    res.status(500).json({ error: true, message: 'Server error', code: 'LAWYER_SEARCH_ERROR' });
  }
}
