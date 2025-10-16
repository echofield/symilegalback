import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type Lawyer = {
  name: string;
  address: string;
  rating: number;
  lat: number;
  lng: number;
};

type LawyersSuccessResponse = {
  lawyers: Lawyer[];
  timestamp: string;
};

type LawyersErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

type LawyersRequestBody = {
  query?: unknown;
  lat?: unknown;
  lng?: unknown;
};

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

function validateCoordinates(lat: unknown, lng: unknown): boolean {
  const hasLat = typeof lat !== 'undefined';
  const hasLng = typeof lng !== 'undefined';

  if (!hasLat && !hasLng) {
    return true;
  }

  if (typeof lat === 'number' && typeof lng === 'number') {
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  return false;
}

function buildMockLawyers(): Lawyer[] {
  return [
    {
      name: 'Cabinet Dupont',
      address: '10 Rue de Rivoli, Paris',
      rating: 4.8,
      lat: 48.8566,
      lng: 2.3522,
    },
    {
      name: 'Étude Lemoine',
      address: '5 Boulevard Sébastopol, Paris',
      rating: 4.7,
      lat: 48.8625,
      lng: 2.3494,
    },
    {
      name: 'Cabinet Rousseau',
      address: '8 Avenue Voltaire, Paris',
      rating: 4.6,
      lat: 48.8578,
      lng: 2.3695,
    },
  ];
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

  const parsedBody = parseRequestBody(req.body);
  const query = parsedBody?.query;
  const { lat, lng } = parsedBody ?? {};

  if (typeof query !== 'string' || query.trim().length === 0 || !validateCoordinates(lat, lng)) {
    res.status(400).json({ error: true, message: 'Validation error' });
    return;
  }

  const lawyers = buildMockLawyers();
  const timestamp = new Date().toISOString();

  if (isDev) {
    console.log('[lawyers] Returning', lawyers.length, 'mock lawyers for query');
  }

  res.status(200).json({ lawyers, timestamp });
}

export default handler;
