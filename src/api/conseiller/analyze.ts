import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractTemplate } from '@/services/templates/loader';

const RequestSchema = z.object({
  problem: z.string().min(50),
  city: z.string().optional(),
});

const ResponseSchema = z.object({}).passthrough();

async function callOpenAIAudit(problem: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const sys = `Tu es un assistant juridique expert. Analyse et retourne UNIQUEMENT du JSON valide.`;
  const user = `Analyse cette situation:\n\n"""\n${problem}\n"""\n\nRéponds UNIQUEMENT en JSON valide avec ce format exact:\n{\n  "summary": "Résumé en 1-2 phrases de la situation",\n  "category": "catégorie juridique principale",\n  "specialty": "spécialité avocat recommandée",\n  "risks": ["risque 1", "risque 2"],\n  "urgency": "Faible|Moyenne|Élevée - explication courte",\n  "complexity": "Simple|Moyenne|Complexe",\n  "recommendedTemplateId": "id-du-template-le-plus-pertinent ou null"\n}\n\nNE retourne RIEN d'autre que ce JSON.`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI error ${r.status}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  const json = JSON.parse(match ? match[0] : text);
  return json as {
    summary: string;
    category: string;
    specialty: string;
    risks: string[];
    urgency: string;
    complexity: string;
    recommendedTemplateId?: string | null;
  };
}

async function callPerplexityLawyers(city: string, specialty: string) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [] as any[];
  const prompt = `Trouve les 5 meilleurs avocats spécialisés en "${specialty}" à ${city}, France.\n\nRetourne UNIQUEMENT un JSON valide:\n{\n  "lawyers": [\n    {\n      "name": "Maître Prénom Nom",\n      "firm": "Nom du cabinet",\n      "specialty": "Spécialité exacte",\n      "city": "Ville",\n      "phone": "Téléphone si disponible",\n      "rating": 4.5\n    }\n  ]\n}\n\nNE retourne RIEN d'autre.`;
  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    return Array.isArray(parsed?.lawyers) ? parsed.lawyers : [];
  } catch {
    return [];
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { problem, city } = req.body as { problem: string; city?: string };

  try {
    const audit = await callOpenAIAudit(problem);
    let recommendedTemplate: any = null;
    if (audit?.recommendedTemplateId) {
      try {
        const tpl = await loadContractTemplate(audit.recommendedTemplateId);
        if (tpl) {
          recommendedTemplate = {
            id: audit.recommendedTemplateId,
            name: tpl.metadata.title,
            reason: `Ce modèle correspond à votre situation (${audit.category})`,
          };
        }
      } catch {}
    }

    let recommendedLawyers: any[] = [];
    if (city && audit?.specialty) {
      recommendedLawyers = await callPerplexityLawyers(city, audit.specialty);
    }

    return res.status(200).json({
      audit: {
        summary: audit.summary,
        risks: audit.risks,
        urgency: audit.urgency,
        complexity: audit.complexity,
      },
      recommendedTemplate,
      recommendedLawyers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('conseiller:analyze error', err);
    return res.status(500).json({ error: true, message: err?.message || 'Analyse failed' });
  }
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));


