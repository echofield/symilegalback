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
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    sort: 'default' | 'alpha';
    jurisdiction: Jurisdiction;
  };
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

const RATE_LIMIT_LIMIT = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function setRateLimitHeaders(res: NextApiResponse, remaining = RATE_LIMIT_LIMIT) {
  const resetUnix = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SECONDS;
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, Math.min(remaining, RATE_LIMIT_LIMIT))));
  res.setHeader('X-RateLimit-Reset', String(resetUnix));
}

function setCacheHeaders(res: NextApiResponse) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
}

function normaliseJurisdiction(query: NextApiRequest['query']): Jurisdiction {
  const raw = query?.jurisdiction;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseJurisdictionParam(value) ?? 'FR';
}

function parsePositiveInt(value: unknown, fallback: number, { min = 1, max = 200 }: { min?: number; max?: number } = {}): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    return fallback;
  }

  if (typeof raw === 'string' && raw.trim().length === 0) {
    return fallback;
  }

  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return null;
  }

  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function parseSortParam(value: unknown): 'default' | 'alpha' {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return 'default';
  }

  const lowered = raw.trim().toLowerCase();
  if (lowered === 'alpha' || lowered === 'alphabetical') {
    return 'alpha';
  }

  return 'default';
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
  setRateLimitHeaders(res);

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
    const sort = parseSortParam(req.query?.sort);
    const page = parsePositiveInt(req.query?.page, 1, { min: 1, max: 1000 });
    const pageSize = parsePositiveInt(req.query?.pageSize, 50, { min: 1, max: 200 });

    if (page === null) {
      res
        .status(400)
        .json({ error: true, message: 'Invalid page parameter', code: 'INVALID_PAGE' });
      return;
    }

    if (pageSize === null) {
      res
        .status(400)
        .json({ error: true, message: 'Invalid pageSize parameter', code: 'INVALID_PAGE_SIZE' });
      return;
    }

    const records = getContractsForJurisdiction(jurisdiction);
    const contracts =
      sort === 'alpha'
        ? [...records].sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
        : records;

    const total = contracts.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    if (totalPages > 0 && page > totalPages) {
      res
        .status(400)
        .json({ error: true, message: 'Page out of range', code: 'PAGE_OUT_OF_RANGE' });
      return;
    }

    const offset = (page - 1) * pageSize;
    const paginated = total === 0 ? [] : contracts.slice(offset, offset + pageSize);

    const responseItems = paginated.map(toResponseItem);

    if (isDev) {
      console.log(
        '[contracts] returning',
        responseItems.length,
        'contracts for',
        jurisdiction,
        'page',
        page,
        'pageSize',
        pageSize,
        'sort',
        sort,
      );
    }

    setCacheHeaders(res);

    const payload: ContractsListResponse = {
      index: responseItems,
      contracts: responseItems,
      timestamp: new Date().toISOString(),
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        sort,
        jurisdiction,
      },
    };

    res.status(200).json(payload);
  } catch (error) {
    if (isDev) {
      console.error('[contracts] failed to build index response', error);
    }

    res.status(500).json({ error: true, message: 'Unable to load contracts', code: 'CONTRACTS_LOAD_FAILED' });
  }
}
