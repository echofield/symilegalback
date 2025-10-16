import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type LawyersRequestBody = {
  query?: unknown;
  lat?: unknown;
  lng?: unknown;
};

type Lawyer = {
  id: string;
  name: string;
  firm: string;
  practiceAreas: string[];
  rating: number;
  yearsExperience: number;
  hourlyRate: number;
  coordinates: {
    lat: number;
    lng: number;
  };
};

type LawyersSuccessResponse = {
  error: false;
  lawyers: Lawyer[];
  total: number;
};

type LawyersErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseRequestBody(body: NextApiRequest['body']): LawyersRequestBody | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as LawyersRequestBody;
    } catch (error) {
      if (isDev) {
        console.error('[lawyers] Failed to parse JSON body', error);
      }
      return null;
    }
  }

  if (typeof body === 'object') {
    return body as LawyersRequestBody;
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

const LAW_FIRM_NAMES = [
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

const PRACTICE_AREAS = [
  'Employment Law',
  'Contract Law',
  'Corporate Law',
  'Labour Relations',
  'Litigation',
  'Compliance',
];

function pickPracticeAreas(): string[] {
  const shuffled = [...PRACTICE_AREAS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function generateMockLawyers(query: string, lat: number, lng: number): Lawyer[] {
  const total = 5 + Math.floor(Math.random() * 6);
  const lawyers: Lawyer[] = [];

  for (let index = 0; index < total; index += 1) {
    const baseName = LAW_FIRM_NAMES[index % LAW_FIRM_NAMES.length];
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    const rating = Number.parseFloat((4.2 + Math.random() * 0.7).toFixed(1));
    const yearsExperience = 5 + Math.floor(Math.random() * 21);
    const hourlyRate = 150 + Math.floor(Math.random() * 151);

    lawyers.push({
      id: `${index + 1}`,
      name: `${baseName.split(' ')[0]} ${index + 1}`,
      firm: baseName,
      practiceAreas: pickPracticeAreas(),
      rating,
      yearsExperience,
      hourlyRate,
      coordinates: {
        lat: Number.parseFloat((lat + latOffset).toFixed(6)),
        lng: Number.parseFloat((lng + lngOffset).toFixed(6)),
      },
    });
  }

  if (isDev) {
    console.log('[lawyers] Generated', lawyers.length, 'mock lawyers for query', query);
  }

  return lawyers;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LawyersSuccessResponse | LawyersErrorResponse>,
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
    const parsedBody = parseRequestBody(req.body);
    const query = parsedBody?.query;
    const lat = parseCoordinate(parsedBody?.lat ?? null);
    const lng = parseCoordinate(parsedBody?.lng ?? null);

    if (typeof query !== 'string' || query.trim().length === 0 || lat === null || lng === null) {
      res.status(400).json({ error: true, message: 'Validation error' });
      return;
    }

    const lawyers = generateMockLawyers(query.trim(), lat, lng);

    res.status(200).json({ error: false, lawyers, total: lawyers.length });
  } catch (error) {
    if (isDev) {
      console.error('[lawyers] Unexpected error', error);
    }
    res.status(500).json({ error: true, message: 'Server error' });
  }
}

export default handler;
