import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractTemplate } from '@/services/templates/loader';
import { rateLimit } from '@/middleware/rateLimit';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  problem: z.string().min(50),
  city: z.string().optional(),
  category: z.string().optional(),
  urgency: z.number().optional(),
  hasEvidence: z.boolean().optional(),
  // Legacy fields for compatibility
  situationType: z.string().optional(),
  urgence: z.string().optional(),
  hasProofs: z.string().optional(),
});

const ResponseSchema = z.object({}).passthrough();

async function callOpenAIAudit(params: {
  description: string;
  category: string;
  urgency: number;
  hasEvidence: boolean;
  city?: string;
}) {
  const { description, category, urgency, hasEvidence, city } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const analysisPrompt = `Tu es Maître Juridique, conseiller juridique expert français avec 20 ans d'expérience.

# CONTEXTE CLIENT

**Situation décrite:**
${description}

**Type de dossier:** ${category}
**Niveau d'urgence déclaré:** ${urgency}/10
**Documents disponibles:** ${hasEvidence ? 'Oui' : 'Non'}
**Localisation:** ${city || 'Non précisée'}

---

# MISSION: ANALYSE JURIDIQUE COMPLÈTE

Fournis une analyse juridique professionnelle selon cette structure JSON EXACTE:

{
  "resume": {
    "titre": "string (max 80 car)",
    "problematiquePrincipale": "string",
    "tagsJuridiques": ["tag1", "tag2", "tag3"]
  },
  "scoring": {
    "urgence": number (1-10),
    "complexite": "Faible|Moyenne|Élevée",
    "risqueJuridique": number (1-10),
    "estimation_cout_min_eur": number,
    "estimation_cout_max_eur": number,
    "duree_estimee_mois": number
  },
  "analyseDetaillee": {
    "faits": ["fait1", "fait2", "..."],
    "cadreJuridique": {
      "textes": ["Code X art. Y", "..."],
      "jurisprudence": [
        {
          "reference": "Cass. civ. 1re, DATE, n° XX-XX.XXX",
          "principe": "string"
        }
      ]
    },
    "risquesIdentifies": [
      {
        "type": "string",
        "gravite": "Faible|Moyen|Élevé",
        "description": "string"
      }
    ],
    "pointsForts": ["point1", "point2"],
    "pointsFaibles": ["point1", "point2"]
  },
  "planAction": {
    "etapesImmediates": [
      {
        "action": "string",
        "delai": "string",
        "priorite": "Haute|Moyenne|Basse"
      }
    ],
    "questionsComplementaires": ["question1", "question2"]
  },
  "recommandation": {
    "strategiePrincipale": "string",
    "prochaineEtapeCritique": "string",
    "needsLawyer": true,
    "lawyerSpecialty": "string"
  },
  "templates": [
    { "nom": "Lettre de mise en demeure", "type": "docx", "description": "string", "id": "string" }
  ],
  "recommendedTemplateId": "string ou null"
}

IMPÉRATIF:
- Pas de texte hors JSON
- Tous les champs remplis (pas de "TODO")
- Chiffres réalistes (coûts actuels France 2025)
- Jurisprudence réelle récente (2020-2024)
- Actions CONCRÈTES (pas vagues)
- Français professionnel impeccable

Tu es un expert. Montre ton expertise.`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 3000,
      messages: [
        { 
          role: 'system', 
          content: 'Tu es un conseiller juridique expert français. Tu réponds UNIQUEMENT en JSON valide, sans texte additionnel.' 
        },
        { 
          role: 'user', 
          content: analysisPrompt 
        }
      ],
      response_format: { type: "json_object" }
    }),
  });
  
  if (!r.ok) {
    throw new Error(`OpenAI API error: ${r.status}`);
  }

  const data = await r.json();
  const content = data.choices[0].message.content;

  // Parse JSON response
  let analysis;
  try {
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    analysis = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('[CONSEILLER] JSON parse error:', parseError);
    throw new Error('Failed to parse AI response');
  }

  // Validate structure
  if (!analysis.resume || !analysis.planAction || !analysis.scoring) {
    console.error('[CONSEILLER] Invalid analysis structure');
    throw new Error('Analysis structure incomplete');
  }

  return analysis;
}

async function callPerplexityLawyers(city: string, specialty: string) {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn('[PERPLEXITY] API key not set');
      return [];
    }

    const query = `Trouve 3 avocats spécialisés en ${specialty} à ${city} France. 
Pour chacun donne: nom complet, cabinet, adresse exacte, téléphone, email si disponible, spécialités, 
années expérience, avis clients si disponibles. Format JSON: [{nom, cabinet, adresse, telephone, email, specialites, experience, avis}]`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui recherche des professionnels du droit en France. Réponds en JSON structuré.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('[PERPLEXITY] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const lawyers = JSON.parse(jsonStr);
        
        // Validate and limit to 3
        if (Array.isArray(lawyers)) {
          return lawyers.slice(0, 3).map((lawyer: any) => ({
            nom: lawyer.nom || 'Non disponible',
            cabinet: lawyer.cabinet || 'Cabinet individuel',
            adresse: lawyer.adresse || `${city}, France`,
            telephone: lawyer.telephone || 'Non disponible',
            email: lawyer.email || 'Non disponible',
            specialites: Array.isArray(lawyer.specialites) ? lawyer.specialites : [specialty],
            experience: lawyer.experience || 'Non précisée',
            avis: lawyer.avis || 'Pas d\'avis disponibles',
            source: 'Perplexity AI'
          }));
        }
      }
    } catch (parseError) {
      console.error('[PERPLEXITY] Parse error:', parseError);
    }

    return [];

  } catch (error) {
    console.error('[PERPLEXITY] Error:', error);
    return [];
  }
}

// Helper function to map category to specialty
function mapCategoryToSpecialty(category: string): string {
  const specialtyMap: Record<string, string> = {
    'Litige avec voisin (bruit, empiètement, etc.)': 'droit immobilier et voisinage',
    'Problème employeur/salarié (licenciement, harcèlement, etc.)': 'droit du travail',
    'Contrat commercial (prestation, vente, etc.)': 'droit commercial et des affaires',
    'Immobilier (achat, location, travaux)': 'droit immobilier',
    'Famille (divorce, garde d\'enfants, succession)': 'droit de la famille',
    'Litige consommation (achat défectueux, SAV)': 'droit de la consommation',
    'Autre': 'droit général'
  };

  return specialtyMap[category] || 'droit général';
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting (10 req/min per IP)
  try {
    await rateLimit(req, res);
  } catch (err) {
    // Rate limit middleware already sends response
    return;
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });
  
  const { 
    problem, 
    city, 
    category,
    urgency,
    hasEvidence,
    // Legacy fields for compatibility
    situationType, 
    urgence, 
    hasProofs 
  } = req.body as { 
    problem: string; 
    city?: string; 
    category?: string;
    urgency?: number;
    hasEvidence?: boolean;
    situationType?: string; 
    urgence?: string; 
    hasProofs?: string; 
  };

  // Validation
  if (!problem || problem.length < 20) {
    return res.status(400).json({
      success: false,
      error: 'Description trop courte (minimum 20 caractères)'
    });
  }

  console.log('[CONSEILLER] Starting analysis:', { 
    city, 
    hasLength: problem.length,
    category: category || situationType,
    urgency: urgency || urgence
  });

  // Timeout strict de 8 secondes avec garde globale
  const TIMEOUT_MS = 8000;
  const startTime = Date.now();

  const withTimeoutGuard = async <T>(
    promise: Promise<T>,
    fallback: T,
    label: string
  ): Promise<T> => {
    const elapsed = Date.now() - startTime;
    const remaining = TIMEOUT_MS - elapsed;
    if (remaining <= 1000) {
      console.log(`[${label}] skipped - insufficient time`);
      return fallback;
    }
    try {
      const result = await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), remaining)),
      ]);
      return result;
    } catch (err) {
      console.log(`[${label}] failed, using fallback`);
      return fallback;
    }
  };

  try {
    // Call enhanced OpenAI audit with timeout guard
    const audit = await withTimeoutGuard(
      callOpenAIAudit({
        description: problem,
        category: category || situationType || 'Non spécifié',
        urgency: urgency || (urgence ? parseInt(urgence) : 5),
        hasEvidence: hasEvidence || hasProofs === 'true',
        city
      }),
      {
        resume: {
          titre: 'Analyse en cours',
          problematiquePrincipale: problem.slice(0, 280),
          tagsJuridiques: ['droit général']
        },
        scoring: {
          urgence: urgency || (urgence ? parseInt(urgence) : 5),
          complexite: 'Moyenne',
          risqueJuridique: 5,
          estimation_cout_min_eur: 500,
          estimation_cout_max_eur: 2000,
          duree_estimee_mois: 3
        },
        analyseDetaillee: {
          faits: ['Situation décrite nécessite un approfondissement'],
          cadreJuridique: {
            textes: [],
            jurisprudence: []
          },
          risquesIdentifies: [],
          pointsForts: [],
          pointsFaibles: []
        },
        planAction: {
          etapesImmediates: [
            { action: 'Consolider les éléments factuels', delai: 'Immédiat', priorite: 'Haute' }
          ],
          questionsComplementaires: ['Préciser les dates clés']
        },
        recommandation: {
          strategiePrincipale: 'Consulter un avocat spécialisé',
          prochaineEtapeCritique: 'Rassembler tous les documents',
          needsLawyer: true,
          lawyerSpecialty: mapCategoryToSpecialty(category || situationType || 'Autre')
        },
        templates: [],
        recommendedTemplateId: null
      },
      'OPENAI'
    );

    // Get recommended template if specified
    let recommendedTemplate: any = null;
    if (audit?.recommendedTemplateId) {
      try {
        const tpl = await loadContractTemplate(audit.recommendedTemplateId);
        if (tpl) {
          recommendedTemplate = {
            id: audit.recommendedTemplateId,
            name: tpl.metadata.title,
            slug: audit.recommendedTemplateId,
            available: true,
            reason: `Ce modèle correspond à votre situation`
          };
        }
      } catch (err) {
        console.warn('[CONSEILLER] Template not found:', audit.recommendedTemplateId);
      }
    }

    // Fetch lawyers with timeout guard if city provided
    let recommendedLawyers: any[] = [];
    if (city && audit?.recommandation?.lawyerSpecialty) {
      const specialty = audit.recommandation.lawyerSpecialty || 
                       mapCategoryToSpecialty(category || situationType || 'Autre');
      
      const baseLawyers: any[] = [];
      const lawyers = await withTimeoutGuard(
        callPerplexityLawyers(city, specialty),
        baseLawyers,
        'PERPLEXITY'
      );
      
      recommendedLawyers = (lawyers || []).map((lawyer: any) => ({
        ...lawyer,
        google_maps_url: lawyer.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(lawyer.adresse || lawyer.address || '')}`
      }));
    }

    // Si on dépasse la fenêtre, renvoyer une analyse partielle
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.log('[CONSEILLER] Exceeded 8s, returning partial analysis');
      return res.status(200).json({
        success: true,
        analysis: {
          ...audit,
          recommendedLawyers: [],
          recommendedTemplate: null,
          metadata: {
            generatedAt: new Date().toISOString(),
            model: 'gpt-4o-mini + perplexity-sonar',
            category: category || situationType,
            urgencyUser: urgency || urgence,
            city,
            hasEvidence: hasEvidence || hasProofs === 'true',
            partial: true
          }
        }
      });
    }

    // Build enriched response
    const enrichedAnalysis = {
      ...audit,
      recommendedLawyers,
      recommendedTemplate,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini + perplexity-sonar',
        category: category || situationType,
        urgencyUser: urgency || urgence,
        city,
        hasEvidence: hasEvidence || hasProofs === 'true'
      },
      pricing: {
        analysisPrice: 29,
        nextSteps: recommendedLawyers.length > 0 
          ? "Consultez un des avocats recommandés ci-dessous"
          : "Consultez un avocat spécialisé pour approfondir"
      }
    };

    console.log('[CONSEILLER] Analysis completed successfully');

    return res.status(200).json({
      success: true,
      analysis: enrichedAnalysis
    });
  } catch (err: any) {
    console.error('conseiller:analyze error', err);
    return res.status(500).json({ error: true, message: err?.message || 'Analyse failed' });
  }
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));
