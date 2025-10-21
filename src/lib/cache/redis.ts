// lib/cache/redis.ts - Redis caching utilities
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export class CacheService {
  private static instance: CacheService;
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value as T | null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = 3600, tags = [] } = options; // Default 1 hour TTL
      
      await redis.setex(key, ttl, JSON.stringify(value));
      
      // Store tags for invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await redis.sadd(`tag:${tag}`, key);
          await redis.expire(`tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await redis.del(...keys);
          await redis.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
    }
  }
}

export const cache = CacheService.getInstance();

// Cache key generators
export const CacheKeys = {
  bondTemplates: () => 'bond:templates',
  bondTemplate: (id: string) => `bond:template:${id}`,
  bondQuestions: (templateId?: string) => templateId ? `bond:questions:${templateId}` : 'bond:questions:all',
  contract: (id: string) => `bond:contract:${id}`,
  contracts: (userId?: string) => userId ? `bond:contracts:${userId}` : 'bond:contracts:all',
} as const;