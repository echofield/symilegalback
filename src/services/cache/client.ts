import IORedis, { Redis } from 'ioredis';

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class RedisCache implements CacheClient {
  constructor(private client: Redis) {}
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

let cacheInstance: CacheClient | null = null;

export async function getCacheClient(): Promise<CacheClient> {
  if (cacheInstance) return cacheInstance;
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const client = new (IORedis as any)(redisUrl) as Redis;
    cacheInstance = new RedisCache(client);
    return cacheInstance;
  }
  cacheInstance = new MemoryCache();
  return cacheInstance;
}

