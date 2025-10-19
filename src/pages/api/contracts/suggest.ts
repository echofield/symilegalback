import { z } from 'zod';
import { suggestContractFR } from '@/services/ai/generate';

const schema = z.object({
  description: z.string().min(10),
  budget: z.number().int().positive().optional(),
  roleA: z.string().optional(),
  roleB: z.string().optional(),
  answers: z.any().optional(),
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: true });

  // Reuse existing AI pipeline; if answers provided, inject into context
  const input = { ...(body.data as any) };
  if (input.answers) {
    try {
      const desc = Array.isArray(input.answers)
        ? input.answers.map((a: any) => `${a?.id || ''}: ${a?.value || a?.answer || a}`).join(', ')
        : Object.entries(input.answers).map(([k, v]) => `${k}: ${v}`).join(', ');
      input.description = `${input.description}\n\nRéponses de l’utilisateur : ${desc}.`;
    } catch {}
  }
  const draft = await suggestContractFR(input);
  res.status(200).json(draft);
}


