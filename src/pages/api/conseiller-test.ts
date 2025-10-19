import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Conseiller Juridique endpoint is working',
      method: 'GET',
      timestamp: new Date().toISOString(),
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasPerplexity: !!process.env.PERPLEXITY_API_KEY
      }
    });
  }

  if (req.method === 'POST') {
    const { problem } = req.body;
    
    return res.status(200).json({
      message: 'Conseiller Juridique POST working',
      received: {
        problem: problem ? problem.substring(0, 50) + '...' : 'No problem provided',
        method: 'POST'
      },
      timestamp: new Date().toISOString(),
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasPerplexity: !!process.env.PERPLEXITY_API_KEY
      }
    });
  }

  return res.status(405).json({ 
    error: true, 
    message: `Method ${req.method} not allowed`,
    allowed: ['GET', 'POST', 'OPTIONS']
  });
}
