import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';

const RequestSchema = z.object({ q: z.string().min(1), near: z.string().optional() });
const ResponseSchema = z.object({
  results: z.array(
    z.object({ name: z.string(), address: z.string().optional(), rating: z.number().optional(), place_id: z.string().optional(), lat: z.number().optional(), lng: z.number().optional() })
  ),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { q, near } = req.query as { q: string; near?: string };

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(200).json({ results: [], timestamp: new Date().toISOString() });

  const params = new URLSearchParams({ query: q, key });
  if (near) params.set('location', near);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
  const r = await fetch(url);
  const json = await r.json();
  const results = (json.results || []).slice(0, 5).map((p: any) => ({
    name: p.name as string,
    address: p.formatted_address as string,
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    place_id: p.place_id as string,
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
  }));

  return res.status(200).json({ results, timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);


