import type { NextApiRequest, NextApiResponse } from 'next';
import frContracts from '@/lib/data/contracts-fr.json';
import enContracts from '@/lib/data/contracts-en.json';
import { organizeContracts, type ContractSummary } from '@/lib/organizeContracts';
import { withCors } from '@/lib/http/cors';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { ContractSummarySchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  lang: z.enum(['fr', 'en']).optional(),
  jurisdiction: z.enum(['FR', 'EN']).optional(),
  category: z.string().optional(),
});

const GroupedContractSchema = z.record(z.array(ContractSummarySchema));

const ResponseSchema = z.object({
  fr: GroupedContractSchema,
  en: GroupedContractSchema,
  flat: z.array(ContractSummarySchema),
  timestamp: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lang, jurisdiction, category } = req.query as {
    lang?: 'fr' | 'en';
    jurisdiction?: 'FR' | 'EN';
    category?: string;
  };

  // Map jurisdiction (FR|EN) to lang (fr|en) for compatibility
  const effectiveLang: 'fr' | 'en' | undefined =
    lang || (jurisdiction ? (jurisdiction === 'FR' ? 'fr' : 'en') : undefined);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  const data = organizeContracts({
    fr: frContracts as ContractSummary[],
    en: enContracts as ContractSummary[],
  });

  if (effectiveLang && category) {
    const filtered = data[effectiveLang][category] ?? [];
    // Also provide flat arrays under `index` and `contracts` for frontend compatibility
    return {
      fr: effectiveLang === 'fr' ? { [category]: filtered } : {},
      en: effectiveLang === 'en' ? { [category]: filtered } : {},
      flat: filtered,
      index: filtered,
      contracts: filtered,
      timestamp: new Date().toISOString(),
    };
  }

  if (effectiveLang) {
    return {
      fr: effectiveLang === 'fr' ? data.fr : {},
      en: effectiveLang === 'en' ? data.en : {},
      flat:
        effectiveLang === 'fr'
          ? data.flat.filter((c) => c.lang === 'fr')
          : data.flat.filter((c) => c.lang === 'en'),
      // Provide compatibility arrays
      index:
        effectiveLang === 'fr'
          ? data.flat.filter((c) => c.lang === 'fr')
          : data.flat.filter((c) => c.lang === 'en'),
      contracts:
        effectiveLang === 'fr'
          ? data.flat.filter((c) => c.lang === 'fr')
          : data.flat.filter((c) => c.lang === 'en'),
      timestamp: new Date().toISOString(),
    };
  }

  // No specific filter: return everything and also a merged compatibility array
  return {
    ...data,
    index: data.flat,
    contracts: data.flat,
    timestamp: new Date().toISOString(),
  };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));

