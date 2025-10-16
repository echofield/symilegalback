import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, message: 'Method not allowed' });

  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: true, message: 'Missing or invalid question' });
  }

  if (question.toLowerCase().includes('cdd') || question.toLowerCase().includes('licenciement')) {
    return res.json({
      output: {
        reply_text: 'Utilisez le modèle de rupture de contrat CDD.',
        action: { type: 'suggest_contract', args: { topic: 'rupture CDD' } },
      },
    });
  }

  return res.json({
    output: {
      reply_text: "Je ne suis pas certain, mais vous pouvez consulter nos modèles de contrat.",
      action: { type: 'suggest_contract', args: { topic: 'general' } },
    },
  });
}
