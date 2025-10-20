// lib/cache/redis.ts - Redis caching implementation
import { Redis } from 'ioredis';
import { env } from '@/config/env';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  if (env.REDIS_URL) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }
  
  return redis;
}

export class CacheService {
  private redis: Redis | null;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      await this.redis.setex(key, expiration, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache key generators
  static contractKey(id: string): string {
    return `contract:${id}`;
  }

  static contractsListKey(filters: Record<string, any>): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `contracts:list:${sortedFilters}`;
  }

  static templateKey(id: string): string {
    return `template:${id}`;
  }

  static templatesListKey(): string {
    return 'templates:list';
  }

  static questionsKey(templateId: string): string {
    return `questions:${templateId}`;
  }

  static analysisKey(problem: string): string {
    const hash = Buffer.from(problem).toString('base64').slice(0, 32);
    return `analysis:${hash}`;
  }

  static lawyersKey(city: string, specialty: string): string {
    return `lawyers:${city}:${specialty}`;
  }
}

export const cache = new CacheService();

// Cache decorator for functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: Parameters<T>) {
      const key = keyGenerator(...args);
      const cached = await cache.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = await method.apply(this, args);
      await cache.set(key, result, ttl);
      
      return result;
    };
  };
}

// Cache middleware for API routes
export function withCache<T>(
  keyGenerator: (req: any) => string,
  ttl?: number
) {
  return function cacheMiddleware(handler: any) {
    return async (req: any, res: any) => {
      const key = keyGenerator(req);
      const cached = await cache.get(key);
      
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        cache.set(key, data, ttl).catch(console.error);
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };
      
      return handler(req, res);
    };
  };
}
