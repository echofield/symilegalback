import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import OpenAI from 'openai';

/**
 * /api/conseiller/chat - Conversational legal consultation endpoint
 * 
 * Flow:
 * 1. User sends initial description (isInitial: true)
 * 2. Backend asks follow-up questions one at a time
 * 3. User answers, backend updates context and asks next question
 * 4. After 5-7 exchanges, backend returns isComplete: true
 * 5. Frontend can then call /api/conseiller/export for PDF
 * 
 * Storage: In-memory Map (for POC), production should use Redis/Database
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory session storage (shared across all requests via global)
interface SessionData {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: Record<string, string>;
  questionCount: number;
}

const sessions = (global as any).__SYMI_CHAT_SESSIONS__ || new Map<string, SessionData>();
(global as any).__SYMI_CHAT_SESSIONS__ = sessions;

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  isInitial: z.boolean().optional().default(false),
});

// Predefined question flow
const QUESTION_FLOW = [
  { id: 'dates', question: "Quelles sont les dates clés de votre situation (début du conflit, signatures, événements importants) ?" },
  { id: 'evidence', question: "Disposez-vous de preuves écrites (contrats, emails, SMS, photos) ? Si oui, lesquelles ?" },
  { id: 'parties', question: "Qui sont les autres parties impliquées (entreprise, particulier, administration) ? Connaissez-vous leur identité complète ?" },
  { id: 'goals', question: "Quel est votre objectif principal (obtenir des dommages, annuler un contrat, faire respecter vos droits, autre) ?" },
  { id: 'urgency', question: "Y a-t-il une deadline ou une urgence particulière (procès en cours, délai de prescription, échéance) ?" },
  { id: 'previous', question: "Avez-vous déjà consulté un avocat ou entamé des démarches (mise en demeure, médiation, dépôt de plainte) ?" },
  { id: 'budget', question: "Quel budget pouvez-vous consacrer à cette démarche juridique (consultation, procédure, frais d'avocat) ?" },
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = RequestSchema.parse(req.body);
    const { sessionId, message, isInitial } = body;

    // Retrieve or create session
    let sessionData = sessions.get(sessionId);
    if (!sessionData) {
      sessionData = {
        messages: [],
        context: {},
        questionCount: 0,
      };
      sessions.set(sessionId, sessionData);
    }

    // Add user message to session
    sessionData.messages.push({ role: 'user', content: message });

    if (isInitial) {
      // First message: store initial description and ask first question
      sessionData.context.initialDescription = message;
      const firstQuestion = QUESTION_FLOW[0];
      sessionData.context[firstQuestion.id] = ''; // Mark as pending
      sessionData.questionCount = 0;

      sessionData.messages.push({ role: 'assistant', content: firstQuestion.question });

      return res.status(200).json({
        nextQuestion: firstQuestion.question,
        partialAnalysis: {
          summary: message.slice(0, 150) + '...',
          progress: 10,
        },
        isComplete: false,
      });
    } else {
      // Follow-up answer: store and determine next question
      const currentQuestionIndex = sessionData.questionCount;
      if (currentQuestionIndex < QUESTION_FLOW.length) {
        const currentQuestion = QUESTION_FLOW[currentQuestionIndex];
        sessionData.context[currentQuestion.id] = message;
        sessionData.questionCount++;

        // Check if we should ask another question or complete
        if (sessionData.questionCount >= QUESTION_FLOW.length || sessionData.questionCount >= 5) {
          // Complete: generate final analysis using OpenAI
          const finalAnalysis = await generateFinalAnalysis(sessionData);

          sessionData.messages.push({
            role: 'assistant',
            content: "Analyse complète. Consultez votre rapport ci-dessous.",
          });

          return res.status(200).json({
            nextQuestion: null,
            partialAnalysis: finalAnalysis,
            isComplete: true,
          });
        } else {
          // Ask next question
          const nextQuestion = QUESTION_FLOW[sessionData.questionCount];
          sessionData.messages.push({ role: 'assistant', content: nextQuestion.question });

          // Generate partial analysis
          const partial = await generatePartialAnalysis(sessionData);

          return res.status(200).json({
            nextQuestion: nextQuestion.question,
            partialAnalysis: partial,
            isComplete: false,
          });
        }
      } else {
        // Shouldn't happen, but safeguard
        return res.status(200).json({
          nextQuestion: null,
          partialAnalysis: await generateFinalAnalysis(sessionData),
          isComplete: true,
        });
      }
    }
  } catch (error: any) {
    console.error('[chat] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        details: error.errors,
      });
    }
    return res.status(500).json({
      error: true,
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Generate partial analysis preview based on current context
 */
async function generatePartialAnalysis(sessionData: SessionData) {
  const { context, questionCount } = sessionData;
  const progress = Math.min(100, Math.round((questionCount / QUESTION_FLOW.length) * 100));

  try {
    const prompt = `Tu es un assistant juridique français. Voici les informations collectées jusqu'à présent :

Description initiale : ${context.initialDescription || 'Non fournie'}
${Object.entries(context).filter(([k]) => k !== 'initialDescription').map(([k, v]) => `${k}: ${v}`).join('\n')}

Génère un résumé JSON court avec ces champs :
{
  "category": "catégorie juridique (ex: droit du travail, droit immobilier)",
  "urgency": "niveau d'urgence (1-10)",
  "complexity": "niveau de complexité (Faible/Moyenne/Élevée)",
  "summary": "résumé en 1-2 phrases"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(rawContent);

    return {
      ...analysis,
      progress,
    };
  } catch (error) {
    console.error('[generatePartialAnalysis] Error:', error);
    return {
      summary: context.initialDescription?.slice(0, 150) + '...',
      progress,
      category: 'Droit général',
      urgency: '5',
      complexity: 'Moyenne',
    };
  }
}

/**
 * Generate final complete analysis using all collected context
 */
async function generateFinalAnalysis(sessionData: SessionData) {
  const { context } = sessionData;

  try {
    const prompt = `Tu es un assistant juridique français expert. Voici toutes les informations collectées :

${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join('\n')}

Génère une analyse juridique complète en JSON avec ces champs :
{
  "summary": "résumé détaillé de la situation (5-7 phrases)",
  "category": "catégorie juridique principale",
  "specialty": "spécialité d'avocat recommandée",
  "urgency": "niveau d'urgence (1-10)",
  "complexity": "complexité (Faible/Moyenne/Élevée)",
  "risks": ["risque 1", "risque 2", "risque 3"],
  "points": ["point juridique clé 1", "point juridique clé 2"],
  "actions": ["action recommandée 1", "action recommandée 2", "action recommandée 3"],
  "needsLawyer": true/false,
  "lawyerSpecialty": "spécialité avocat",
  "estimatedCost": "estimation des frais juridiques",
  "timeline": "délai estimé de résolution"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(rawContent);

    return {
      ...analysis,
      progress: 100,
    };
  } catch (error) {
    console.error('[generateFinalAnalysis] Error:', error);
    return {
      summary: context.initialDescription || 'Situation juridique complexe nécessitant une analyse approfondie.',
      category: 'Droit général',
      specialty: 'Avocat généraliste',
      urgency: '5',
      complexity: 'Moyenne',
      risks: ['Analyse limitée par manque de données'],
      points: ['Consulter un avocat pour une analyse détaillée'],
      actions: ['Rassembler les documents pertinents', 'Consulter un avocat spécialisé'],
      needsLawyer: true,
      lawyerSpecialty: 'Droit général',
      estimatedCost: 'Variable selon la complexité',
      timeline: 'À déterminer avec un avocat',
      progress: 100,
    };
  }
}

export default handler;

