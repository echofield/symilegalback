import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Simple test endpoint working',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST') {
    return res.status(200).json({ 
      message: 'POST test endpoint working',
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: true, message: 'Method not allowed' });
}
