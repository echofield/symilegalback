import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { loadContractsIndex } from '@/services/templates/loader';
import fs from 'fs/promises';
import path from 'path';
import { ContractsIndexEntrySchema } from '@/lib/validation/schemas';

const RequestSchema = z.object({ jurisdiction: z.string().optional() });
const ResponseSchema = z.object({ index: z.array(ContractsIndexEntrySchema), timestamp: z.string() });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jurisdiction } = req.query as { jurisdiction?: string };
  let index = await loadContractsIndex();
  if (jurisdiction) {
    // Filter by reading each file metadata.jurisdiction
    const root = process.cwd();
    const filtered: typeof index = [];
    for (const entry of index) {
      try {
        const filePath = path.join(root, entry.path.replace(/^\//, ''));
        const raw = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(raw);
        if (json?.metadata?.jurisdiction?.toUpperCase() === jurisdiction.toUpperCase()) {
          filtered.push(entry);
        }
      } catch {
        // ignore unreadable entries
      }
    }
    index = filtered;
  }
  return res.status(200).json({ index, timestamp: new Date().toISOString() });
}

export default withValidation(RequestSchema, ResponseSchema, handler);

