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

  const sys = `Tu es un expert juridique français. Analyse les situations juridiques avec précision et fournis des conseils actionnables.`;

  const user = `Analyse cette situation juridique :

CONTEXTE:
- Type: ${situationType || 'Non spécifié'}
- Urgence: ${urgence || 'Non spécifié'}
- Preuves: ${hasProofs || 'Non spécifié'}

SITUATION:
${problem}

Réponds en JSON valide avec ce format simplifié :

{
  "summary": "Résumé en 2-3 phrases",
  "category": "Catégorie juridique principale",
  "specialty": "Spécialité requise",
  "risks": ["Risque 1", "Risque 2"],
  "points": ["Point de droit 1", "Point 2"],
  "actions": ["Action immédiate 1", "Action 2"],
  "urgency": "Score 1-10",
  "complexity": "Simple/Moyenne/Complexe",
  "recommendedTemplateId": "template-id-ou-null",
  "needsLawyer": true/false,
  "lawyerSpecialty": "Spécialité avocat",
  "followupQuestions": ["Question 1", "Question 2"]
}

RÈGLES:
- Sois concis mais précis
- Cite des articles de loi si possible
- needsLawyer=true si enjeux > 5000€ ou procédure judiciaire`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800, // Réduit de 1200 à 800
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
  
  const prompt = `Trouve 5 avocats spécialisés en "${specialty}" à ${city}, France.

Pour chaque avocat, fournis:
- nom: "Nom complet"
- cabinet: "Nom du cabinet"
- adresse: "Adresse complète"
- telephone: "Téléphone"
- email: "Email"
- site: "Site web"
- specialites: ["Spécialité 1", "Spécialité 2"]
- experience: "X années"
- tarif: "XXX€/heure"

Format JSON: {"lawyers": [{"nom": "...", "cabinet": "...", ...}]}`;

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
          content: 'Tu es un assistant spécialisé dans la recherche d\'avocats en France. Réponds toujours en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500, // Réduit pour aller plus vite
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

  // Timeout de 8 secondes pour éviter les 504
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), 8000)
  );

  try {
    const auditPromise = callOpenAIAudit(problem, situationType, urgence, hasProofs);
    const audit = await Promise.race([auditPromise, timeoutPromise]) as any;
    
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
      try {
        const lawyersPromise = callPerplexityLawyers(city, audit.specialty);
        recommendedLawyers = await Promise.race([lawyersPromise, timeoutPromise]) as any[];
        // Add Google Maps links to lawyers
        recommendedLawyers = recommendedLawyers.map(lawyer => ({
          ...lawyer,
          google_maps_url: lawyer.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(lawyer.adresse || lawyer.address || '')}`
        }));
      } catch (err) {
        console.warn('Perplexity lawyers search failed:', err);
        recommendedLawyers = [];
      }
    }

    return res.status(200).json({
      audit: {
        summary: audit.summary,
        category: audit.category,
        specialty: audit.specialty,
        risks: audit.risks || [],
        points: audit.points || [],
        actions: audit.actions || [],
        urgency: audit.urgency,
        complexity: audit.complexity,
        // Format simplifié pour éviter les timeouts
        legalQualification: {
          category: audit.category,
          subcategory: audit.specialty,
          legalNature: 'À déterminer',
          applicableLaw: ['Code civil', 'Code du travail']
        },
        stakeholders: {
          parties: ['Client', 'Prestataire'],
          thirdParties: [],
          jurisdiction: 'Tribunal compétent'
        },
        financialAnalysis: {
          estimatedAmount: 'À estimer',
          minAmount: 'À estimer',
          maxAmount: 'À estimer',
          costs: {
            legalFees: 'À estimer',
            courtFees: 'À estimer',
            otherCosts: 'À estimer'
          }
        },
        timelineAnalysis: {
          prescriptionDelay: 'À déterminer',
          remainingTime: 'À déterminer',
          criticalDates: [],
          estimatedDuration: 'À estimer'
        },
        riskAssessment: {
          immediateRisks: audit.risks?.map((r: string) => ({ risk: r, probability: 'Moyenne', impact: '5' })) || [],
          legalRisks: [],
          financialRisks: [],
          reputationalRisks: [],
          globalRisk: '5'
        },
        legalPoints: audit.points?.map(p => ({
          point: p,
          explanation: 'À développer',
          references: ['Code civil'],
          strength: 'Moyenne'
        })) || [],
        actionPlan: {
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
        evidenceRequired: {
          essential: [],
          supporting: [],
          obtaining: []
        },
        resolutionStrategies: {
          amicable: { possible: true, probability: 'Moyenne', approach: 'Négociation', duration: '2-4 mois', cost: '500-2000€' },
          mediation: { recommended: true, type: 'Médiation conventionnelle', duration: '1-3 mois', cost: '1000-3000€' },
          litigation: { lastResort: true, procedure: 'Procédure applicable', duration: '6-18 mois', successRate: '60-80%', cost: '3000-15000€' }
        },
        lawyerRecommendation: {
          necessary: audit.needsLawyer || false,
          urgency: 'Sous 1 mois',
          specialty: audit.specialty || audit.lawyerSpecialty || 'À déterminer',
          subSpecialties: [],
          expertise: [],
          estimatedHours: '20-50 heures',
          budget: '2000-10000€'
        },
        templates: {
          recommendedTemplateId: audit.recommendedTemplateId || null,
          alternativeTemplates: [],
          customizationNeeded: [],
          clausesToAdd: []
        },
        followUp: {
          questions: audit.followupQuestions || [],
          missingInfo: [],
          assumptions: []
        },
        metadata: {
          complexity: audit.complexity || 'Moyenne',
          urgency: audit.urgency || '5',
          confidence: '80%',
          lastUpdated: new Date().toISOString()
        }
      },
      recommendedTemplate,
      needsLawyer: Boolean(audit?.needsLawyer),
      lawyerSpecialty: audit?.specialty || audit?.lawyerSpecialty || null,
      followupQuestions: audit?.followupQuestions || [],
      recommendedLawyers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('conseiller:analyze error', err);
    return res.status(500).json({ error: true, message: err?.message || 'Analyse failed' });
  }
}

export default withCors({}, withValidation(RequestSchema, ResponseSchema, handler));


