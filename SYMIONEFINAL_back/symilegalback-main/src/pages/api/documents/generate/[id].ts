import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiMiddleware } from '@/lib/http/cors';
import { loadContractTemplate } from '@/services/templates/loader';
import { buildPrompt } from '@/services/ai/generate';
import { getAIClient } from '@/services/ai/adapter';
import { z } from 'zod';

const TEMPLATE_ID_MAP: Record<string, string> = {
  cdd: 'contrat-de-travail-dur-e-d-termin-e-cdd',
  stage: 'convention-de-stage',
  nda_mutuel: 'mutual-non-disclosure-agreement',
};

// Inline schemas to avoid module resolution issues
const cddSchema = z.object({
  employeur_nom: z.string().min(2, 'Nom employeur requis'),
  salarie_nom: z.string().min(2, 'Nom salarié requis'),
  motif: z.string().min(3, 'Motif requis'),
  poste: z.string().min(2, 'Poste requis'),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Format AAAA-MM-JJ'),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Format AAAA-MM-JJ'),
  remuneration: z.number({ invalid_type_error: 'Montant numérique requis' }).positive('Doit être > 0'),
});

const stageSchema = z.object({
  organisme_accueil: z.string().min(2),
  etablissement_enseignement: z.string().min(2),
  stagiaire_nom: z.string().min(2),
  formation_suivie: z.string().min(2),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  gratification: z.number().nonnegative().optional(),
});

const ndaMutuelSchema = z.object({
  party_a: z.string().min(2),
  party_b: z.string().min(2),
  purpose: z.string().min(3),
  term_months: z.number().int().positive(),
});

const SCHEMAS: Record<string, any> = {
  cdd: cddSchema,
  stage: stageSchema,
  nda_mutuel: ndaMutuelSchema,
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { id } = req.query as { id: string };
  const templateId = TEMPLATE_ID_MAP[id];
  if (!templateId) return res.status(400).json({ error: true, message: 'Unsupported document type' });

  const schema = SCHEMAS[id];
  if (!schema) return res.status(500).json({ error: true, message: 'Validation schema missing' });

  let inputs: Record<string, any>;
  try {
    inputs = schema.parse(req.body || {});
  } catch (err: any) {
    return res.status(400).json({ error: true, message: 'Invalid data', details: err?.issues || err?.message });
  }

  try {
    const template = await loadContractTemplate(templateId);
    const prompt = buildPrompt(template, inputs, false);
    const ai = getAIClient();
    const generated_text = await ai.generate(prompt);
    return res.status(200).json({ success: true, contract_id: templateId, generated_text, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: true, message: err?.message || 'Generation failed' });
  }
}

export default withApiMiddleware()(handler);


