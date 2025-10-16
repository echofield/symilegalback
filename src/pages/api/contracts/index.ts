import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type IndexEntry = {
  id: string;
  title: string;
  category: string;
  lang: 'fr' | 'en';
};

type ContractsResponse = {
  contracts: IndexEntry[];
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normaliseContracts(data: unknown, lang: 'fr' | 'en'): IndexEntry[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [] as IndexEntry[];
    }

    const { id, title, category } = entry as Record<string, unknown>;

    if (typeof id === 'string' && typeof title === 'string' && typeof category === 'string') {
      return [
        {
          id,
          title,
          category,
          lang,
        },
      ];
    }

    return [] as IndexEntry[];
  });
}

async function loadContracts(): Promise<IndexEntry[]> {
  try {
    const [{ default: frContracts }, { default: enContracts }] = await Promise.all([
      import('@/lib/data/contracts-fr.json'),
      import('@/lib/data/contracts-en.json'),
    ]);

    return [
      ...normaliseContracts(frContracts, 'fr'),
      ...normaliseContracts(enContracts, 'en'),
    ];
  } catch (error) {
    if (isDev) {
      console.error('[contracts] Failed to load contract data', error);
    }
    return [];
  }
}

function parseLang(query: NextApiRequest['query']): 'fr' | 'en' | undefined {
  const langParam = query?.lang;
  const value = Array.isArray(langParam) ? langParam[0] : langParam;

  if (value === 'fr' || value === 'en') {
    return value;
  }

  return undefined;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ContractsResponse | { error: string }>) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const langFilter = parseLang(req.query);

  const contracts = await loadContracts();
  const filteredContracts = langFilter ? contracts.filter((contract) => contract.lang === langFilter) : contracts;

  if (isDev) {
    console.log('[contracts] Returning', filteredContracts.length, 'contracts');
  }

  return res.status(200).json({ contracts: filteredContracts });
}

export default handler;
