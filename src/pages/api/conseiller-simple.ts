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
    
    if (!problem || problem.length < 10) {
      return res.status(400).json({ error: true, message: 'Problem description too short' });
    }

    // Test OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: true, message: 'OPENAI_API_KEY not set' });
    }

    // Simple OpenAI test
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
            content: 'Tu es un assistant juridique expert. Analyse et retourne UNIQUEMENT du JSON valide.' 
          },
          { 
            role: 'user', 
            content: `Analyse cette situation juridique française: "${problem}". Réponds UNIQUEMENT en JSON avec ce format: {"summary": "résumé", "category": "catégorie", "urgency": "Faible|Moyenne|Élevée", "needsLawyer": true|false}` 
          }
        ],
        max_tokens: 200,
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

    return res.status(200).json({
      success: true,
      message: 'Conseiller Juridique working',
      problem: problem.substring(0, 100) + '...',
      city: city || 'Non spécifié',
      analysis: result,
      timestamp: new Date().toISOString()
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
