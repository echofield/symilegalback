import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getBondTemplates, getBondTemplateById } from '@/lib/bondTemplates';
import { cache, CacheKeys } from '@/lib/cache/redis';

const querySchema = z.object({ id: z.string().optional() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: true, message: 'Invalid query' });

    const id = parsed.data.id;
    if (id) {
      // Try cache first
      const cacheKey = CacheKeys.bondTemplate(id);
      let tpl = await cache.get(cacheKey);
      
      if (!tpl) {
        tpl = await getBondTemplateById(id);
        if (tpl) {
          await cache.set(cacheKey, tpl, { ttl: 3600, tags: ['bond-templates'] });
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        data: { templates: tpl ? [tpl] : [] },
        message: 'Template retrieved successfully',
        timestamp: new Date().toISOString()
      });
    }

    // Try cache first for all templates
    const cacheKey = CacheKeys.bondTemplates();
    let all = await cache.get(cacheKey);
    
    if (!all) {
      all = await getBondTemplates();
      await cache.set(cacheKey, all, { ttl: 3600, tags: ['bond-templates'] });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: { templates: all },
      message: 'Templates retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('templates endpoint error', err?.message || err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
}


