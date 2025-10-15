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
  const { lang, category } = req.query as { lang?: 'fr' | 'en'; category?: string };

  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  const data = organizeContracts({
    fr: frContracts as ContractSummary[],
    en: enContracts as ContractSummary[],
  });

  if (lang && category) {
    const filtered = data[lang][category] ?? [];
    return {
      fr: lang === 'fr' ? { [category]: filtered } : {},
      en: lang === 'en' ? { [category]: filtered } : {},
      flat: filtered,
      timestamp: new Date().toISOString(),
    };
  }

  if (lang) {
    return {
      fr: lang === 'fr' ? data.fr : {},
      en: lang === 'en' ? data.en : {},
      flat: lang === 'fr' ? data.flat.filter((c) => c.lang === 'fr') : data.flat.filter((c) => c.lang === 'en'),
      timestamp: new Date().toISOString(),
    };
  }

  return { ...data, timestamp: new Date().toISOString() };
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));

