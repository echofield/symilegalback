import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { monitoring } from '@/lib/monitoring';

const querySchema = z.object({ id: z.string().optional() });
const DATA_PATH = path.join(process.cwd(), 'src', 'lib', 'data', 'bond-questions-enhanced.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: true, message: 'Invalid query' });

    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const dict = JSON.parse(raw) as Record<string, any[]>;

    const id = parsed.data.id;
    let questions: any;
    
    if (id) {
      questions = dict[id] ?? [];
    } else {
      questions = dict;
    }

    // Log de l'événement
    monitoring.logEvent('bond_questions_requested', {
      templateId: id,
      questionsCount: Array.isArray(questions) ? questions.length : Object.keys(questions).length,
    });

    return res.status(200).json({ 
      ok: true, 
      questions: questions,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('questions endpoint error', err?.message || err);
    monitoring.captureError(err, { endpoint: 'contracts/questions' });
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}


