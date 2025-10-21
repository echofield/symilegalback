import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getBondTemplates, getBondTemplateById } from '@/lib/bondTemplates';

// Safe cache import with fallback
let cache: any = null;
let CacheKeys: any = null;

try {
  const cacheModule = await import('@/lib/cache/redis');
  cache = cacheModule.cache;
  CacheKeys = cacheModule.CacheKeys;
} catch (error) {
  console.warn('Redis cache not available, using direct database calls');
}

const querySchema = z.object({ id: z.string().optional() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'Method not allowed' });
    if (!process.env.FEATURE_BOND) return res.status(503).json({ error: true, message: 'Bond module disabled' });

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: true, message: 'Invalid query' });

    const id = parsed.data.id;
    if (id) {
      // Try cache first if available
      let tpl = null;
      if (cache && CacheKeys) {
        const cacheKey = CacheKeys.bondTemplate(id);
        tpl = await cache.get(cacheKey);
      }
      
      if (!tpl) {
        tpl = await getBondTemplateById(id);
        if (tpl && cache && CacheKeys) {
          const cacheKey = CacheKeys.bondTemplate(id);
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

    // Try cache first for all templates if available
    let all = null;
    if (cache && CacheKeys) {
      const cacheKey = CacheKeys.bondTemplates();
      all = await cache.get(cacheKey);
    }
    
    if (!all) {
      all = await getBondTemplates();
      if (cache && CacheKeys) {
        const cacheKey = CacheKeys.bondTemplates();
        await cache.set(cacheKey, all, { ttl: 3600, tags: ['bond-templates'] });
      }
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


