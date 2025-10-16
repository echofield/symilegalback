import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type ContractTemplate = Record<string, unknown> & {
  id: string;
  lang: 'fr' | 'en';
};

type TemplateResponse =
  | { template: ContractTemplate }
  | {
      error: true;
      message: string;
    };

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseId(query: NextApiRequest['query']): string | undefined {
  const idParam = query?.id;
  const value = Array.isArray(idParam) ? idParam[0] : idParam;

  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseLang(query: NextApiRequest['query']): 'fr' | 'en' | undefined {
  const langParam = query?.lang;
  const value = Array.isArray(langParam) ? langParam[0] : langParam;

  if (value === 'fr' || value === 'en') {
    return value;
  }

  return undefined;
}

function normaliseTemplates(data: unknown, lang: 'fr' | 'en'): ContractTemplate[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [] as ContractTemplate[];
    }

    const record = entry as Record<string, unknown>;
    const id = record.id;

    if (typeof id !== 'string' || id.trim().length === 0) {
      return [] as ContractTemplate[];
    }

    return [
      {
        ...record,
        id,
        lang,
      },
    ];
  });
}

async function loadTemplatesForLang(lang: 'fr' | 'en'): Promise<ContractTemplate[] | null> {
  try {
    const templatesModule =
      lang === 'fr'
        ? await import('@/lib/data/contracts-fr.json')
        : await import('@/lib/data/contracts-en.json');

    return normaliseTemplates(templatesModule.default, lang);
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Failed to load templates for lang', lang, error);
    }

    return null;
  }
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateResponse>,
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: true, message: 'Method not allowed' });
    return;
  }

  const contractId = parseId(req.query);

  if (!contractId) {
    res.status(400).json({ error: true, message: 'Validation error' });
    return;
  }

  const langFilter = parseLang(req.query);

  const templateSets = langFilter
    ? [await loadTemplatesForLang(langFilter)]
    : await Promise.all([loadTemplatesForLang('fr'), loadTemplatesForLang('en')]);

  const hadLoadFailure = templateSets.some((set) => set === null);
  const templates = templateSets.flatMap((set) => (set ?? []));

  if (templates.length === 0 && hadLoadFailure) {
    res.status(500).json({ error: true, message: 'Server error' });
    return;
  }

  const template = templates.find((entry) => entry.id === contractId);

  if (!template) {
    res.status(404).json({ error: true, message: 'Template not found' });
    return;
  }

  if (isDev) {
    console.log('[contracts:id] Returning template', contractId, 'for lang', template.lang);
  }

  res.status(200).json({ template });
}

export default handler;
