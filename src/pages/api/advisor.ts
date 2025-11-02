import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS (simple)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, message } = (req.body as any) || {};
  const q = typeof question === 'string' && question.trim().length ? question : (typeof message === 'string' ? message : '');
  if (!q) return res.status(400).json({ error: 'Missing question' });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        { role: 'system', content: 'Tu es un assistant juridique français concis. 4 phrases max.' },
        { role: 'user', content: String(q).slice(0, 2000) },
      ],
    });
    const reply = completion.choices[0]?.message?.content || '';
    const needsHandoff = /date|preuve|montant|détail|contexte|18|questionnaire/i.test(reply);
    return res.status(200).json({ success: true, reply, handoffSuggested: needsHandoff, entryQuestionId: 'situation' });
  } catch (e: any) {
    return res.status(200).json({ success: true, reply: 'Je rencontre un problème technique momentanément. Réessayez dans un instant.', handoffSuggested: false });
  }
}


