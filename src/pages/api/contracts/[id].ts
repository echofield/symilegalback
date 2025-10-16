import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type ContractTemplate = {
  id: string;
  lang: 'fr' | 'en';
  [key: string]: unknown;
};

type TemplateSuccessResponse = {
  template: ContractTemplate;
};

type TemplateErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseId(query: NextApiRequest['query']): string | null {
  const idParam = query?.id;
  const value = Array.isArray(idParam) ? idParam[0] : idParam;

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
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

async function loadTemplates(): Promise<ContractTemplate[] | null> {
  try {
    const [{ default: frTemplates }, { default: enTemplates }] = await Promise.all([
      import('@/lib/data/contracts-fr.json'),
      import('@/lib/data/contracts-en.json'),
    ]);

    return [
      ...normaliseTemplates(frTemplates, 'fr'),
      ...normaliseTemplates(enTemplates, 'en'),
    ];
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Failed to load contract templates', error);
    }
    return null;
  }
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TemplateSuccessResponse | TemplateErrorResponse>,
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

  try {
    const contractId = parseId(req.query);

    if (!contractId) {
      res.status(400).json({ error: true, message: 'Validation error' });
      return;
    }

    const templates = await loadTemplates();

    if (!templates) {
      res.status(500).json({ error: true, message: 'Server error' });
      return;
    }

    const template = templates.find((entry) => entry.id === contractId);

    if (!template) {
      res.status(404).json({ error: true, message: 'Template not found' });
      return;
    }

    if (isDev) {
      console.log('[contracts:id] Returning template', template.id, 'for lang', template.lang);
    }

    res.status(200).json({ template });
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Unexpected error', error);
    }
    res.status(500).json({ error: true, message: 'Server error' });
  }
}

export default handler;
