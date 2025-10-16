import type { NextApiRequest, NextApiResponse } from 'next';
import { findContractById, parseJurisdictionParam, type Jurisdiction } from '@/lib/contracts/data';
import { loadContractTemplate } from '@/services/templates/loader';
import type { ContractTemplate } from '@/types/contracts';

export const runtime = 'nodejs';

type Clause = {
  id: string;
  title: string;
  body: string;
  text: string;
};

type TemplateResponse = {
  template: {
    id: string;
    title: string;
    description?: string;
    metadata: ContractTemplate['metadata'];
    inputs: ContractTemplate['inputs'];
    clauses: Clause[];
    category: string;
    lang: 'fr' | 'en';
    keywords: string[];
  };
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

function parseId(query: NextApiRequest['query']): string | null {
  const raw = query?.id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveJurisdiction(query: NextApiRequest['query']): Jurisdiction | undefined {
  const raw = query?.jurisdiction;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseJurisdictionParam(value);
}

function normaliseMetadata(
  template: ContractTemplate,
  fallbackTitle: string,
  fallbackJurisdiction: Jurisdiction,
): ContractTemplate['metadata'] {
  const metadata =
    template.metadata ?? {
      title: fallbackTitle,
      jurisdiction: fallbackJurisdiction,
      governing_law: fallbackJurisdiction,
      version: '1.0.0',
    };
  return {
    title: metadata.title || fallbackTitle,
    jurisdiction: metadata.jurisdiction || fallbackJurisdiction,
    governing_law: metadata.governing_law || fallbackJurisdiction,
    version: metadata.version || '1.0.0',
  };
}

function normaliseClauses(template: ContractTemplate): Clause[] {
  return (template.clauses ?? []).map((clause, index) => {
    const body = typeof clause.body === 'string' ? clause.body : '';
    return {
      id: typeof clause.id === 'string' && clause.id.trim().length > 0 ? clause.id : `clause-${index + 1}`,
      title: typeof clause.title === 'string' && clause.title.trim().length > 0 ? clause.title : `Clause ${index + 1}`,
      body,
      text: body,
    };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateResponse | ErrorResponse>,
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
    const id = parseId(req.query);
    if (!id) {
      res.status(400).json({ error: true, message: 'Invalid contract id', code: 'INVALID_CONTRACT_ID' });
      return;
    }

    const explicitJurisdiction = resolveJurisdiction(req.query);
    const jurisdiction = explicitJurisdiction ?? 'FR';
    let contract = findContractById(id, jurisdiction);

    if (!contract && explicitJurisdiction === undefined) {
      contract = findContractById(id);
    }

    if (!contract) {
      res.status(404).json({ error: true, message: 'Template not found', code: 'TEMPLATE_NOT_FOUND' });
      return;
    }

    const template = await loadContractTemplate(contract.id);
    const metadata = normaliseMetadata(template, contract.title, contract.jurisdiction);
    const clauses = normaliseClauses(template);
    const description = contract.description ?? `Modèle ${contract.title}.`;

    const payload: TemplateResponse = {
      template: {
        id: contract.id,
        title: contract.title,
        description,
        metadata,
        inputs: template.inputs ?? [],
        clauses,
        category: contract.category,
        lang: contract.lang,
        keywords: contract.keywords,
      },
      timestamp: new Date().toISOString(),
    };

    setCacheHeaders(res);

    if (isDev) {
      console.log('[contracts:id] returning template', contract.id, 'for jurisdiction', contract.jurisdiction);
    }

    res.status(200).json(payload);
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] unexpected error', error);
    }

    res.status(500).json({ error: true, message: 'Server error', code: 'CONTRACT_TEMPLATE_ERROR' });
  }
}
