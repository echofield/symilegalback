import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  try {
    // Test OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    
    if (!openaiKey) {
      return res.status(500).json({ error: true, message: 'OPENAI_API_KEY not set' });
    }
    
    if (!perplexityKey) {
      return res.status(500).json({ error: true, message: 'PERPLEXITY_API_KEY not set' });
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
        messages: [{ role: 'user', content: 'Say "API keys working" in French' }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ 
        error: true, 
        message: `OpenAI API error: ${response.status}`,
        openaiKey: openaiKey.substring(0, 10) + '...',
        perplexityKey: perplexityKey.substring(0, 10) + '...'
      });
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || 'No response';

    return res.status(200).json({
      success: true,
      message: 'API keys are working',
      openaiResponse: result,
      openaiKey: openaiKey.substring(0, 10) + '...',
      perplexityKey: perplexityKey.substring(0, 10) + '...'
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: true, 
      message: error.message,
      stack: error.stack
    });
  }
}
