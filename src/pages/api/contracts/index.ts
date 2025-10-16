import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getContractsForJurisdiction,
  parseJurisdictionParam,
  type Jurisdiction,
  type NormalizedContractRecord,
} from '@/lib/contracts/data';

export const runtime = 'nodejs';

type ContractsListItem = {
  id: string;
  title: string;
  category: string;
  path: string;
  lang: 'fr' | 'en';
  keywords: string[];
};

type ContractsListResponse = {
  index: ContractsListItem[];
  contracts: ContractsListItem[];
  timestamp: string;
};

type ErrorResponse = {
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

function normaliseJurisdiction(query: NextApiRequest['query']): Jurisdiction {
  const raw = query?.jurisdiction;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseJurisdictionParam(value) ?? 'FR';
}

function toResponseItem(record: NormalizedContractRecord): ContractsListItem {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    path: record.path,
    lang: record.lang,
    keywords: record.keywords,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContractsListResponse | ErrorResponse>,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: true, message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const jurisdiction = normaliseJurisdiction(req.query);
    const contracts = getContractsForJurisdiction(jurisdiction).map(toResponseItem);

    if (isDev) {
      console.log('[contracts] returning', contracts.length, 'contracts for', jurisdiction);
    }

    const payload: ContractsListResponse = {
      index: contracts,
      contracts,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(payload);
  } catch (error) {
    if (isDev) {
      console.error('[contracts] failed to build index response', error);
    }

    res.status(500).json({ error: true, message: 'Unable to load contracts', code: 'CONTRACTS_LOAD_FAILED' });
  }
}
