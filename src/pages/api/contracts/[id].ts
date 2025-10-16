import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

type RawContract = {
  id?: string | number;
  title?: string;
  [key: string]: unknown;
};

type ErrorResponse = {
  error: true;
  message: string;
};

const isDev = process.env.NODE_ENV !== 'production';

function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function asContractArray(data: unknown): RawContract[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((entry): entry is RawContract => Boolean(entry) && typeof entry === 'object');
}

async function loadAllContracts(): Promise<RawContract[]> {
  try {
    const [{ default: frContracts }, { default: enContracts }] = await Promise.all([
      import('@/lib/data/contracts-fr.json'),
      import('@/lib/data/contracts-en.json'),
    ]);

    return [...asContractArray(frContracts), ...asContractArray(enContracts)];
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Failed to load contract data', error);
    }
    return [];
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RawContract | ErrorResponse>,
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
      res.status(400).json({ error: true, message: 'Invalid contract id' });
      return;
    }

    const target = contractId.trim();
    const lowerTarget = target.toLowerCase();

    const contracts = await loadAllContracts();

    const match = contracts.find((entry) => {
      const { id, title } = entry;

      if (typeof id === 'string' && id.trim().toLowerCase() === lowerTarget) {
        return true;
      }

      if (typeof id === 'number' && id.toString() === target) {
        return true;
      }

      if (typeof title === 'string' && title.trim().toLowerCase() === lowerTarget) {
        return true;
      }

      return false;
    });

    if (!match) {
      res.status(404).json({ error: true, message: 'Template not found' });
      return;
    }

    if (isDev) {
      console.log('[contracts:id] Returning template', match.id ?? match.title);
    }

    res.status(200).json(match);
  } catch (error) {
    if (isDev) {
      console.error('[contracts:id] Unexpected error', error);
    }

    res.status(500).json({ error: true, message: 'Server error' });
  }
}
