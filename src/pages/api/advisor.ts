import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'Missing question' });

  try {
    const system = 'Tu es un assistant juridique français concis. 4 phrases max. Si la question nécessite des informations détaillées (dates, preuves, montants), suggère un passage au “mode conseiller (18 questions)”.';
    const user = String(question).slice(0, 2000);
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 220,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    const reply = completion.choices[0]?.message?.content || '';
    const needsHandoff = /date|preuve|montant|détail|contexte|plus d'informations|18/i.test(reply);
    return res.status(200).json({ success: true, reply, handoffSuggested: needsHandoff, entryQuestionId: 'situation' });
  } catch (e: any) {
    return res.status(200).json({ success: true, reply: "Je rencontre un problème technique momentanément. Réessayez dans un instant.", handoffSuggested: false });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  try {
    const { problem, city } = req.body;
    
    if (!problem || problem.length < 5) {
      return res.status(400).json({ error: true, message: 'Problem description too short' });
    }

    // Test OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: true, message: 'OPENAI_API_KEY not set' });
    }

    // OpenAI analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un assistant juridique expert français. Analyse et retourne UNIQUEMENT du JSON valide.' 
          },
          { 
            role: 'user', 
            content: `Analyse cette situation juridique française: "${problem}". Réponds UNIQUEMENT en JSON avec ce format: {"summary": "résumé en 1-2 phrases", "category": "catégorie juridique", "urgency": "Faible|Moyenne|Élevée", "needsLawyer": true|false, "actions": ["action 1", "action 2"], "risks": ["risque 1", "risque 2"]}` 
          }
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ 
        error: true, 
        message: `OpenAI API error: ${response.status}`,
        details: await response.text()
      });
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || 'No response';

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(result);
    } catch {
      analysis = { summary: result, category: "Analyse générale", urgency: "Moyenne", needsLawyer: false };
    }

    return res.status(200).json({
      success: true,
      message: 'Conseiller Juridique - Analyse terminée',
      problem: problem.substring(0, 100) + '...',
      city: city || 'Non spécifié',
      analysis: analysis,
      timestamp: new Date().toISOString(),
      apiKeys: {
        openai: !!process.env.OPENAI_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY
      }
    });

  } catch (error: any) {
    console.error('Conseiller error:', error);
    return res.status(500).json({ 
      error: true, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


