import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { getNearbyLawyers } from '@/lib/googleMaps';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  query: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const LawyerSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  rating: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().optional(),
  placeId: z.string().optional(),
});

const ResponseSchema = z.object({
  lawyers: z.array(LawyerSchema),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  const { query, lat, lng } = req.body as { query: string; lat?: number; lng?: number };
  const lawyers = await getNearbyLawyers(query, lat, lng);

  return { lawyers, timestamp: new Date().toISOString() };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));
