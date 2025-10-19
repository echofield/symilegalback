import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractTemplate } from '@/services/templates/loader';

export const runtime = 'nodejs';

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
  const user = `Analyse cette situation:\n\n"""\n${problem}\n"""\n\nRéponds UNIQUEMENT en JSON valide avec ce format exact (pas d'explications en dehors du JSON):\n{\n  "summary": "Résumé en 1-2 phrases de la situation",
  "category": "catégorie juridique principale",
  "specialty": "spécialité avocat recommandée",
  "risks": ["risque 1", "risque 2"],
  "points": ["point juridique 1", "point 2"],
  "actions": ["action 1", "action 2"],
  "urgency": "Faible|Moyenne|Élevée - explication courte",
  "complexity": "Simple|Moyenne|Complexe",
  "recommendedTemplateId": "id-du-template-le-plus-pertinent ou null",
  "templateAvailable": true|false,
  "needsLawyer": true|false,
  "lawyerSpecialty": "spécialité avocat si needsLawyer=true sinon null",
  "followupQuestions": ["question complémentaire si description incomplète"]
}\n\nRègles pour needsLawyer=true: enjeux > 5000€, litige/procédure, pénal, ou négociation complexe.`;

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
    points?: string[];
    actions?: string[];
    urgency: string;
    complexity: string;
    recommendedTemplateId?: string | null;
    needsLawyer?: boolean;
    templateAvailable?: boolean;
    lawyerSpecialty?: string | null;
    followupQuestions?: string[];
  };
}

async function callPerplexityLawyers(city: string, specialty: string) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return [] as any[];
  const prompt = `Trouve 5 avocats spécialisés en "${specialty}" à ${city}, France. Retourne UNIQUEMENT ce JSON:\n{\n  "lawyers": [\n    { "name": "", "firm": "", "specialty": "", "city": "", "phone": "", "email": "", "address": "", "rating": 0 }\n  ]\n}`;
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
            slug: audit.recommendedTemplateId,
            available: ['contrat-de-travail-dur-e-ind-termin-e-cdi','freelance-services-agreement','one-way-non-disclosure-agreement','bail-d-habitation-non-meubl','convention-de-rupture-conventionnelle','terms-of-service','promesse-synallagmatique-de-vente-immobili-re','partnership-agreement','contrat-de-prestation-de-services','reconnaissance-de-dette'].includes(audit.recommendedTemplateId),
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
        points: audit.points || [],
        actions: audit.actions || [],
        urgency: audit.urgency,
        complexity: audit.complexity,
      },
      recommendedTemplate,
      needsLawyer: Boolean(audit?.needsLawyer),
      lawyerSpecialty: audit?.lawyerSpecialty || audit?.specialty || null,
      followupQuestions: Array.isArray(audit?.followupQuestions) ? audit.followupQuestions : [],
      recommendedLawyers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('conseiller:analyze error', err);
    return res.status(500).json({ error: true, message: err?.message || 'Analyse failed' });
  }
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));


