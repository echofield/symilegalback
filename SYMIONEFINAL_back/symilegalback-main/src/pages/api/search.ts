import type { NextApiRequest, NextApiResponse } from 'next';
import frContracts from '@/lib/data/contracts-fr.json';
import enContracts from '@/lib/data/contracts-en.json';
import allContracts from '@/lib/data/all-contracts.json';
import { findRelevantContracts } from '@/lib/search';
import { getNearbyLawyers } from '@/lib/googleMaps';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { ContractSummarySchema } from '@/lib/validation/schemas';
import type { ContractSummary } from '@/lib/organizeContracts';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  query: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  lang: z.enum(['fr', 'en']).optional(),
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
  suggestedContracts: z.array(ContractSummarySchema),
  lawyers: z.array(LawyerSchema),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  const { query, lat, lng, lang } = req.body as {
    query: string;
    lat?: number;
    lng?: number;
    lang?: 'fr' | 'en';
  };

  const frList = frContracts as ContractSummary[];
  const enList = enContracts as ContractSummary[];
  const allList = allContracts as ContractSummary[];

  const pool: ContractSummary[] = lang ? (lang === 'fr' ? frList : enList) : allList;

  const suggestions = findRelevantContracts(pool, query);
  const lawyers = await getNearbyLawyers(query, lat, lng);

  return {
    suggestedContracts: suggestions,
    lawyers,
    timestamp: new Date().toISOString(),
  };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));
