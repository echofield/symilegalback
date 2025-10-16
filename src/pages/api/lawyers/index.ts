import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type PlaceResult = {
  name?: string;
  formatted_address?: string;
  rating?: number;
  geometry?: { location?: { lat?: number; lng?: number } };
  place_id?: string;
};

type LawyersResponse = {
  lawyers: Array<{
    name: string;
    address: string;
    rating: number | undefined;
    lat: number | undefined;
    lng: number | undefined;
    place_id: string | undefined;
  }>;
  timestamp: string;
};

type ErrorResponse = {
  error: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LawyersResponse | ErrorResponse>,
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, lat, lng } = req.body as { query?: string; lat?: number; lng?: number };

  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    const key =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error('Google Maps API key missing');
    }

    const loc = lat && lng ? `${lat},${lng}` : '48.8566,2.3522';
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query,
      )}&location=${loc}&radius=10000&key=${key}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Google Places API responded with ${resp.status}`);
    }

    const data = (await resp.json()) as { results?: PlaceResult[] };

    const lawyers = (data.results || []).map((r) => ({
      name: r.name ?? 'Nom indisponible',
      address: r.formatted_address ?? 'Adresse indisponible',
      rating: r.rating,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      place_id: r.place_id,
    }));

    return res.status(200).json({ lawyers, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Lawyer API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch lawyers', message });
  }
}
