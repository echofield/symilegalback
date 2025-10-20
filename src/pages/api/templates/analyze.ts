import type { NextApiRequest, NextApiResponse } from 'next';
import { withCors } from '@/lib/http/cors';
import { loadContractsIndex } from '@/services/templates/loader';

const FREE_TEMPLATE_IDS = new Set<string>([
  'contrat-de-travail-dur-e-ind-termin-e-cdi',
  'freelance-services-agreement',
  'one-way-non-disclosure-agreement',
  'bail-d-habitation-non-meubl',
  'convention-de-rupture-conventionnelle',
  'terms-of-service',
  'promesse-synallagmatique-de-vente-immobili-re',
  'partnership-agreement',
  'contrat-de-prestation-de-services',
  'reconnaissance-de-dette',
]);

function scoreMatch(text: string, query: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  if (t.includes(q)) score += 1;
  // token overlap
  const qt = q.split(/\s+/).filter(Boolean);
  score += qt.reduce((acc, tok) => acc + (t.includes(tok) ? 0.2 : 0), 0);
  return score;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  const { query } = (req.body || {}) as { query?: string };
  const q = String(query || '').trim();
  if (!q) return res.status(200).json({ interpretation: '', matchingTemplates: [] });

  const index = await loadContractsIndex();
  const enriched = index.map((e) => ({
    id: e.id,
    name: e.title,
    description: undefined as string | undefined,
    category: e.category,
    available: FREE_TEMPLATE_IDS.has(e.id),
    matchScore: Math.max(
      scoreMatch(e.title, q),
      scoreMatch(e.category, q),
      scoreMatch(e.id.replace(/[-_]/g, ' '), q)
    ),
  }));

  const matches = enriched
    .filter((t) => t.matchScore > 0.2)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  const interpretation = matches.length > 0
    ? `Votre recherche correspond à ${matches[0].category} — nous proposons des modèles adaptés.`
    : `Votre besoin semble spécifique. Décrivez-le au Conseiller pour une orientation ou un avocat spécialisé.`

  return res.status(200).json({
    interpretation,
    matchingTemplates: matches,
    needsCustom: matches.length === 0,
    noMatchReason: matches.length === 0 ? 'Aucun template standard ne correspond exactement à votre requête.' : undefined,
    recommendedLawyerType: matches.length === 0 ? 'À préciser via le Conseiller' : undefined,
  });
}

export default withCors({}, handler);


