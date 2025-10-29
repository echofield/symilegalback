import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractTemplate } from '@/services/templates/loader';
import { rateLimit } from '@/middleware/rateLimit';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  problem: z.string().min(20, 'Veuillez décrire votre situation (≥ 20 caractères).'),
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
}, signal?: AbortSignal) {
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

Tu dois produire une analyse professionnelle en 6 sections:

## 1. RÉSUMÉ EXÉCUTIF (3-4 phrases)
- Synthèse factuelle de la situation
- Parties impliquées et leurs positions
- Enjeu principal du litige
- Gravité de la situation

## 2. QUALIFICATION JURIDIQUE PRÉCISE

**Fondement légal:**
- Article(s) de loi applicable(s) (Code Civil, Pénal, Travail, Commerce selon cas)
- Texte exact de l'article principal
- Décrets/arrêtés pertinents si applicable

**Jurisprudence de référence:**
- Au moins 1 décision de justice similaire récente (2020-2024)
- Format: [Juridiction, date, numéro]
- Principe dégagé par la décision

**Doctrine:**
- Position majoritaire des juristes
- Interprétation dominante

## 3. ANALYSE DES FORCES & FAIBLESSES

**Points forts du dossier (✓):**
- [Liste 3-5 éléments favorables]
- Pour chaque point: pourquoi c'est un atout

**Points faibles / Risques (✗):**
- [Liste 3-5 vulnérabilités]
- Pour chaque point: comment mitiger

**Preuves à constituer ABSOLUMENT:**
- [Liste précise avec format]
- Exemple: "Constat d'huissier (€150-300, délai obtention 48h-1 semaine)"
- Exemple: "Témoignages écrits signés (gratuit, obtention immédiate)"

## 4. PLAN D'ACTION CHRONOLOGIQUE

### Phase 1: IMMÉDIAT (0-48h)
1. [Action précise] - Coût: €X - Durée: Xh - Objectif: [résultat attendu]
2. [Action précise] - Coût: €X - Durée: Xh - Objectif: [résultat attendu]

### Phase 2: COURT TERME (3-15 jours)
1. [Action précise] - Coût: €X - Durée: X jours - Objectif: [résultat attendu]
2. [Action précise] - Coût: €X - Durée: X jours - Objectif: [résultat attendu]

### Phase 3: MOYEN TERME (1-3 mois)
1. [Action précise] - Coût: €X - Durée: X semaines - Objectif: [résultat attendu]

**Alternatives à la procédure:**
- Médiation (coût: €X, durée: X semaines, taux succès: X%)
- Transaction amiable (modèle de lettre fourni)
- Autre solution (préciser)

## 5. ESTIMATION FINANCIÈRE DÉTAILLÉE

**Scénario A: Résolution amiable**
- Lettre recommandée: €5-10
- Constat huissier (si besoin): €150-300
- Médiation: €200-800
- Total: €355-1110
- Durée: 2-8 semaines

**Scénario B: Procédure judiciaire**
- Honoraires avocat: €1500-3500 (selon complexité)
- Frais de justice: €150-500
- Expert si nécessaire: €500-2000
- Total: €2150-6000
- Durée: 6-18 mois

**Aide juridictionnelle:**
- Éligible si revenus < €1500/mois (personne seule)
- Couvre 25-100% des frais selon revenus

## 6. SCORING & RECOMMANDATION FINALE

**Urgence recalculée (IA):** X/10
- Justification: [Pourquoi ce score]

**Complexité juridique:** Faible / Moyenne / Élevée
- Justification: [Pourquoi ce niveau]

**Pronostic de réussite:** X%
- Basé sur: [Facteurs clés]

**Risque financier:** Faible / Moyen / Élevé
- Pire scénario: [Décrire]
- Meilleur scénario: [Décrire]

**RECOMMANDATION STRATÉGIQUE:**
[Conseil principal: tenter amiable d'abord? Aller direct procédure? Abandonner?]

**PROCHAINE ÉTAPE CRITIQUE:**
[L'action #1 à faire dans les 48h]

---

# FORMAT DE RÉPONSE

Réponds en JSON structuré UNIQUEMENT, format exact:

{
  "resume": "string (max 300 caractères)",
  "category": "string",
  "qualificationJuridique": {
    "fondementLegal": ["Article X du Code Y: texte complet"],
    "jurisprudence": ["Cass. date, détails"],
    "doctrine": "string"
  },
  "analyse": {
    "forcesdossier": ["point 1", "point 2", "point 3"],
    "faiblesses": ["risque 1", "risque 2", "risque 3"],
    "preuvesAConstituer": [
      { "type": "Constat huissier", "cout": "€150-300", "delai": "48h-1 semaine", "priorite": "haute" }
    ]
  },
  "planAction": {
    "immediat": [
      { "action": "Envoyer lettre recommandée", "cout": "€5", "duree": "1h", "objectif": "Constituer preuve tentative amiable" }
    ],
    "courtTerme": [
      { "action": "Commander constat huissier", "cout": "€200", "duree": "3 jours", "objectif": "Documenter les nuisances" }
    ],
    "moyenTerme": [
      { "action": "Consulter avocat spécialisé", "cout": "€150-300", "duree": "2 semaines", "objectif": "Préparer procédure si échec amiable" }
    ],
    "alternatives": ["Médiation via conciliateur justice (gratuit, 2 mois)", "Transaction amiable avec dédit (modèle fourni)"]
  },
  "estimationFinanciere": {
    "amiable": { "cout": "€355-800", "duree": "2-8 semaines", "details": ["Lettre AR: €5", "Constat: €200", "Médiation: €150-595"] },
    "judiciaire": { "cout": "€2150-6000", "duree": "6-18 mois", "details": ["Avocat: €1500-3500", "Frais justice: €150-500", "Expert: €500-2000"] },
    "aideJuridictionnelle": "Éligible si revenus < €1500/mois (personne seule) - Couvre 25-100% selon barème"
  },
  "scoring": {
    "urgenceIA": 8,
    "urgenceJustification": "string",
    "complexite": "Moyenne",
    "complexiteJustification": "string",
    "pronosticReussite": 75,
    "pronosticFacteurs": "string",
    "risqueFinancier": "Moyen",
    "pireScenario": "string",
    "meilleurScenario": "string"
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
    signal,
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

async function callPerplexityLawyers(city: string, specialty: string, signal?: AbortSignal) {
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
        max_tokens: 400,
      }),
      signal,
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

  try {
    // Call enhanced OpenAI audit with timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const audit = await callOpenAIAudit({
      description: problem,
      category: category || situationType || 'Non spécifié',
      urgency: urgency || (urgence ? parseInt(urgence) : 5),
      hasEvidence: hasEvidence || hasProofs === 'true',
      city
    }, controller.signal);
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

    // Search for lawyers if city provided
    let recommendedLawyers: any[] = [];
    if (city && audit?.recommandation?.strategiePrincipale) {
      const specialty = audit.recommandation.lawyerSpecialty || 
                       mapCategoryToSpecialty(audit.category || category || 'Autre');
      
      try {
        recommendedLawyers = await callPerplexityLawyers(city, specialty, controller.signal);
      } catch (e) {
        recommendedLawyers = [];
      }
      
      // Add Google Maps URLs
      recommendedLawyers = recommendedLawyers.map((lawyer: any) => ({
        ...lawyer,
        google_maps_url: `https://maps.google.com/?q=${encodeURIComponent(lawyer.adresse || '')}`
      }));
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

    clearTimeout(timeoutId);
    console.log('[CONSEILLER] Analysis completed successfully');

    return res.status(200).json({
      success: true,
      analysis: enrichedAnalysis
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return res.status(200).json({ success: false, error: "L'analyse prend trop de temps. Veuillez réessayer avec une description plus courte.", timeout: true } as any);
    }
    console.error('conseiller:analyze error', err);
    return res.status(200).json({ success: false, error: 'Une erreur est survenue lors de l\'analyse. Veuillez réessayer.' } as any);
  }
}

export default withCors(withValidation(RequestSchema, ResponseSchema, handler));


