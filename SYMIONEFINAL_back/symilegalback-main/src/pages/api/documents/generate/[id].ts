import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiMiddleware } from '@/lib/http/cors';
import { loadContractTemplate } from '@/services/templates/loader';
import { buildPrompt } from '@/services/ai/generate';
import { getAIClient } from '@/services/ai/adapter';
import { cddSchema } from '@/lib/validation/forms/cdd';
import { stageSchema } from '@/lib/validation/forms/stage';
import { ndaMutuelSchema } from '@/lib/validation/forms/nda-mutuel';

const TEMPLATE_ID_MAP: Record<string, string> = {
  cdd: 'contrat-de-travail-dur-e-d-termin-e-cdd',
  stage: 'convention-de-stage',
  nda_mutuel: 'mutual-non-disclosure-agreement',
};

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


