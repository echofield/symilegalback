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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normaliseTemplates(data: unknown, lang: 'fr' | 'en'): ContractTemplate[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [] as ContractTemplate[];
    }

    const { id, ...rest } = entry as Record<string, unknown>;

    if (typeof id !== 'string' || id.trim().length === 0) {
      return [] as ContractTemplate[];
    }

    return [
      {
        ...rest,
        id,
        lang,
      },
    ];
  });
}

export default async function handler(
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
    const idParam = req.query?.id;
    const contractId = Array.isArray(idParam) ? idParam[0] : idParam;

    if (typeof contractId !== 'string' || contractId.trim().length === 0) {
      res.status(400).json({ error: true, message: 'Validation error' });
      return;
    }

    const [{ default: frTemplates }, { default: enTemplates }] = await Promise.all([
      import('@/lib/data/contracts-fr.json'),
      import('@/lib/data/contracts-en.json'),
    ]);

    const templates = [
      ...normaliseTemplates(frTemplates, 'fr'),
      ...normaliseTemplates(enTemplates, 'en'),
    ];

    const template = templates.find((entry) => entry.id === contractId.trim());

    if (!template) {
      res.status(404).json({ error: true, message: 'Template not found' });
      return;
    }

    if (isDev) {
      console.log('[contracts:id] Returning template', template.id);
    }

    res.status(200).json({ template });
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Failed to resolve template', error);
    }

    res.status(500).json({ error: true, message: 'Server error' });
  }
}
