import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import { withCors } from '@/lib/http/cors';
import { z } from 'zod';
import { loadContractTemplate } from '@/services/templates/loader';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  problem: z.string().min(50),
  city: z.string().optional(),
  situationType: z.string().optional(),
  urgence: z.string().optional(),
  hasProofs: z.string().optional(),
});

const ResponseSchema = z.object({}).passthrough();

async function callOpenAIAudit(problem: string, situationType?: string, urgence?: string, hasProofs?: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const sys = `Tu es un expert juridique français avec 20 ans d'expérience. 
Tu analyses les situations juridiques en profondeur avec précision et rigueur.
Tu connais parfaitement le droit français : Code civil, Code du travail, Code de commerce, Code pénal, etc.
Tu fournis toujours des références légales précises et des conseils actionnables.`;

  const user = `Analyse cette situation juridique de manière APPROFONDIE et PROFESSIONNELLE :

CONTEXTE ENRICHISSANT:
- Type de situation: ${situationType || 'Non spécifié'}
- Niveau d'urgence: ${urgence || 'Non spécifié'}
- Preuves disponibles: ${hasProofs || 'Non spécifié'}

SITUATION DÉTAILLÉE:
"""
${problem}
"""

Réponds UNIQUEMENT en JSON valide avec ce format COMPLET ET DÉTAILLÉ :

{
  "summary": "Résumé exécutif en 2-3 phrases avec qualification juridique précise",
  
  "legalQualification": {
    "category": "Catégorie juridique principale (ex: Droit du travail, Droit commercial, etc.)",
    "subcategory": "Sous-catégorie spécifique",
    "legalNature": "Nature juridique exacte (contrat, délit, litige, etc.)",
    "applicableLaw": ["Article L.XXX du Code Y", "Loi du XX/XX/XXXX", "Jurisprudence Cass. XX"]
  },
  
  "stakeholders": {
    "parties": ["Partie 1: statut/rôle", "Partie 2: statut/rôle"],
    "thirdParties": ["Tiers impliqués le cas échéant"],
    "jurisdiction": "Tribunal compétent (TI, TJ, Prud'hommes, Commerce, etc.)"
  },
  
  "financialAnalysis": {
    "estimatedAmount": "Montant estimé de l'enjeu en euros",
    "minAmount": "Montant minimum",
    "maxAmount": "Montant maximum",
    "costs": {
      "legalFees": "Estimation frais d'avocat",
      "courtFees": "Frais de justice",
      "otherCosts": "Autres frais (expertise, huissier, etc.)"
    }
  },
  
  "timelineAnalysis": {
    "prescriptionDelay": "Délai de prescription applicable",
    "remainingTime": "Temps restant avant prescription",
    "criticalDates": [
      {"date": "JJ/MM/AAAA ou délai", "event": "Événement critique", "mandatory": true}
    ],
    "estimatedDuration": "Durée estimée de résolution (amiable/judiciaire)"
  },
  
  "riskAssessment": {
    "immediateRisks": [
      {"risk": "Description du risque", "probability": "Faible/Moyenne/Élevée", "impact": "1-10"}
    ],
    "legalRisks": [
      {"risk": "Risque juridique", "penalty": "Sanction possible", "references": ["Art. XXX"]}
    ],
    "financialRisks": [
      {"risk": "Risque financier", "amount": "Montant estimé", "mitigation": "Solution"}
    ],
    "reputationalRisks": ["Impact réputation si applicable"],
    "globalRisk": "Score 1-10 avec justification"
  },
  
  "legalPoints": [
    {
      "point": "Point de droit crucial",
      "explanation": "Explication détaillée",
      "references": ["Article L.XXX", "Jurisprudence"],
      "strength": "Force du point (Faible/Moyenne/Forte)"
    }
  ],
  
  "actionPlan": {
    "immediate": [
      {
        "action": "Action à faire sous 48h",
        "responsible": "Qui doit le faire",
        "deadline": "Délai précis",
        "documents": ["Documents nécessaires"],
        "cost": "Coût estimé"
      }
    ],
    "shortTerm": [
      {
        "action": "Action sous 15 jours",
        "responsible": "Responsable",
        "deadline": "Délai",
        "prerequisites": ["Prérequis"]
      }
    ],
    "mediumTerm": [
      {
        "action": "Action sous 3 mois",
        "milestone": "Jalon clé",
        "expectedOutcome": "Résultat attendu"
      }
    ]
  },
  
  "evidenceRequired": {
    "essential": ["Preuve indispensable 1", "Preuve 2"],
    "supporting": ["Preuve complémentaire"],
    "obtaining": [
      {"evidence": "Type de preuve", "method": "Comment l'obtenir", "delay": "Délai"}
    ]
  },
  
  "resolutionStrategies": {
    "amicable": {
      "possible": true,
      "probability": "Faible/Moyenne/Élevée",
      "approach": "Stratégie de négociation",
      "duration": "2-4 mois",
      "cost": "500-2000€"
    },
    "mediation": {
      "recommended": true,
      "type": "Médiation conventionnelle/judiciaire",
      "duration": "1-3 mois",
      "cost": "1000-3000€"
    },
    "litigation": {
      "lastResort": true,
      "procedure": "Procédure applicable",
      "duration": "6-18 mois",
      "successRate": "60-80%",
      "cost": "3000-15000€"
    }
  },
  
  "lawyerRecommendation": {
    "necessary": true,
    "urgency": "Immédiate/Sous 7 jours/Sous 1 mois",
    "specialty": "Spécialité exacte requise",
    "subSpecialties": ["Sous-spécialité 1", "Sous-spécialité 2"],
    "expertise": ["Expertise spécifique recherchée"],
    "estimatedHours": "20-50 heures",
    "budget": "2000-10000€"
  },
  
  "templates": {
    "recommendedTemplateId": "ID du template le plus pertinent",
    "alternativeTemplates": ["template-alternatif-1", "template-alternatif-2"],
    "customizationNeeded": ["Point à personnaliser 1", "Point 2"],
    "clausesToAdd": ["Clause spécifique à ajouter"]
  },
  
  "followUp": {
    "questions": [
      "Question pour clarifier un point important non mentionné",
      "Question sur un détail crucial manquant"
    ],
    "missingInfo": ["Information manquante importante"],
    "assumptions": ["Hypothèse faite à valider"]
  },
  
  "metadata": {
    "complexity": "Simple/Moyenne/Complexe/Très complexe",
    "urgency": "Score 1-10 avec justification",
    "confidence": "Niveau de confiance dans l'analyse 70-100%",
    "lastUpdated": "Date de dernière mise à jour du droit applicable"
  }
}

RÈGLES IMPÉRATIVES :
- Toujours citer des articles de loi précis
- Donner des montants réalistes en euros
- Fournir des délais concrets
- needsLawyer=true si : enjeux > 5000€, procédure judiciaire, pénal, ou négociation complexe
- Être précis sur les juridictions compétentes
- Donner un plan d'action chronologique clair`;

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
  
  const prompt = `Trouve 10 avocats RÉELS et VÉRIFIÉS spécialisés en "${specialty}" 
situés à ${city} ou proche (max 30km), France.

Critères prioritaires:
- Disponibles cette semaine
- Honoraires moyens
- Inscrits au Barreau avec numéro CNBF
- Cabinets actifs en 2024-2025
- Avec coordonnées vérifiables

Pour CHAQUE avocat, fournis OBLIGATOIREMENT:
- Nom complet et titre (Maître)
- Cabinet (raison sociale complète)
- Adresse précise avec code postal
- Téléphone direct (pas standard)
- Email professionnel
- Site web
- Spécialités certifiées CNB
- Années d'expérience
- Tarif consultation (en euros)
- Honoraires moyens (fourchette)
- Langues parlées
- Disponibilité actuelle
- Lien Google Maps (format: https://maps.google.com/?q=ADRESSE_COMPLETE)

Recherche aussi sur:
- Annuaire du Barreau de ${city}
- ordre-avocats.fr
- consultation.avocat.fr
- justifit.fr
- alexia.fr
- doctrine.fr
- Google Maps "avocat ${specialty} ${city}"

Format JSON structuré UNIQUEMENT, pas de texte.`;

  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant spécialisé dans la recherche d\'avocats en France. Tu ne fournis que des informations vérifiées et actuelles. Réponds toujours en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      top_p: 0.9,
      return_citations: true,
      search_domain_filter: ["ordre-avocats.fr", "cnbf.fr", "consultation.avocat.fr", "justifit.fr"],
      search_recency_filter: "month",
      stream: false
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
  const { problem, city, situationType, urgence, hasProofs } = req.body as { 
    problem: string; 
    city?: string; 
    situationType?: string; 
    urgence?: string; 
    hasProofs?: string; 
  };

  try {
    const audit = await callOpenAIAudit(problem, situationType, urgence, hasProofs);
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
      // Add Google Maps links to lawyers
      recommendedLawyers = recommendedLawyers.map(lawyer => ({
        ...lawyer,
        google_maps_url: lawyer.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(lawyer.adresse || lawyer.address || '')}`
      }));
    }

    return res.status(200).json({
      audit: {
        summary: audit.summary,
        // Nouveau format professionnel
        legalQualification: (audit as any).legalQualification || {
          category: audit.category,
          subcategory: audit.specialty,
          legalNature: 'À déterminer',
          applicableLaw: ['Code civil', 'Code du travail']
        },
        stakeholders: (audit as any).stakeholders || {
          parties: ['Client', 'Prestataire'],
          thirdParties: [],
          jurisdiction: 'Tribunal compétent'
        },
        financialAnalysis: (audit as any).financialAnalysis || {
          estimatedAmount: 'À estimer',
          minAmount: 'À estimer',
          maxAmount: 'À estimer',
          costs: {
            legalFees: 'À estimer',
            courtFees: 'À estimer',
            otherCosts: 'À estimer'
          }
        },
        timelineAnalysis: (audit as any).timelineAnalysis || {
          prescriptionDelay: 'À déterminer',
          remainingTime: 'À déterminer',
          criticalDates: [],
          estimatedDuration: 'À estimer'
        },
        riskAssessment: (audit as any).riskAssessment || {
          immediateRisks: audit.risks?.map(r => ({ risk: r, probability: 'Moyenne', impact: '5' })) || [],
          legalRisks: [],
          financialRisks: [],
          reputationalRisks: [],
          globalRisk: '5'
        },
        legalPoints: (audit as any).legalPoints || audit.points?.map(p => ({
          point: p,
          explanation: 'À développer',
          references: ['Code civil'],
          strength: 'Moyenne'
        })) || [],
        actionPlan: (audit as any).actionPlan || {
          immediate: audit.actions?.map(a => ({
            action: a,
            responsible: 'À déterminer',
            deadline: 'À déterminer',
            documents: [],
            cost: 'À estimer'
          })) || [],
          shortTerm: [],
          mediumTerm: []
        },
        evidenceRequired: (audit as any).evidenceRequired || {
          essential: [],
          supporting: [],
          obtaining: []
        },
        resolutionStrategies: (audit as any).resolutionStrategies || {
          amicable: { possible: true, probability: 'Moyenne', approach: 'Négociation', duration: '2-4 mois', cost: '500-2000€' },
          mediation: { recommended: true, type: 'Médiation conventionnelle', duration: '1-3 mois', cost: '1000-3000€' },
          litigation: { lastResort: true, procedure: 'Procédure applicable', duration: '6-18 mois', successRate: '60-80%', cost: '3000-15000€' }
        },
        lawyerRecommendation: (audit as any).lawyerRecommendation || {
          necessary: audit.needsLawyer || false,
          urgency: 'Sous 1 mois',
          specialty: audit.specialty || audit.lawyerSpecialty || 'À déterminer',
          subSpecialties: [],
          expertise: [],
          estimatedHours: '20-50 heures',
          budget: '2000-10000€'
        },
        templates: (audit as any).templates || {
          recommendedTemplateId: audit.recommendedTemplateId || null,
          alternativeTemplates: [],
          customizationNeeded: [],
          clausesToAdd: []
        },
        followUp: (audit as any).followUp || {
          questions: audit.followupQuestions || [],
          missingInfo: [],
          assumptions: []
        },
        metadata: (audit as any).metadata || {
          complexity: audit.complexity || 'Moyenne',
          urgency: audit.urgency || '5',
          confidence: '80%',
          lastUpdated: new Date().toISOString()
        },
        // Compatibilité avec l'ancien format
        risks: (audit as any).riskAssessment?.immediateRisks?.map((r: any) => r.risk) || audit.risks || [],
        points: (audit as any).legalPoints?.map((p: any) => p.point) || audit.points || [],
        actions: (audit as any).actionPlan?.immediate?.map((a: any) => a.action) || audit.actions || [],
        urgency: (audit as any).metadata?.urgency || audit.urgency,
        complexity: (audit as any).metadata?.complexity || audit.complexity,
      },
      recommendedTemplate,
      needsLawyer: Boolean((audit as any)?.lawyerRecommendation?.necessary || audit?.needsLawyer),
      lawyerSpecialty: (audit as any)?.lawyerRecommendation?.specialty || audit?.specialty || audit?.lawyerSpecialty || null,
      followupQuestions: Array.isArray((audit as any)?.followUp?.questions) ? (audit as any).followUp.questions : audit?.followupQuestions || [],
      recommendedLawyers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('conseiller:analyze error', err);
    return res.status(500).json({ error: true, message: err?.message || 'Analyse failed' });
  }
}

export default withCors({}, withValidation(RequestSchema, ResponseSchema, handler));


