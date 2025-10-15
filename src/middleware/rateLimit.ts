import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { ErrorCode, sendError } from '@/lib/errors';

const WINDOW_MS = 60 * 1000;
const LIMIT = 5;

const inMemoryBuckets = new Map<string, number[]>();
let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch (error) {
    console.warn('[rateLimit] Redis configuration missing, falling back to in-memory limiter');
    redisClient = null;
    return redisClient;
  }
}

function trackInMemory(key: string, now: number): number {
  const windowStart = now - WINDOW_MS;
  const existing = inMemoryBuckets.get(key) ?? [];
  const filtered = existing.filter((ts) => ts > windowStart);
  filtered.push(now);
  inMemoryBuckets.set(key, filtered);
  return filtered.length;
}

// Sliding window rate limiter: 5 req/min per IP
export async function rateLimit(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const key = `rl:${ip}`;

  let count = 0;
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      await redis.zadd(key, { score: now, member: `${now}` });
      count = await redis.zcount(key, windowStart, now);
      await redis.expire(key, 120);
    } catch (error) {
      console.error('[rateLimit] Redis error, switching to in-memory fallback', error);
      count = trackInMemory(key, now);
    }
  } else {
    count = trackInMemory(key, now);
  }

  const remaining = Math.max(0, LIMIT - count);
  res.setHeader('X-RateLimit-Limit', String(LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.max(0, Math.ceil((windowStart + WINDOW_MS - now) / 1000))));

  if (count > LIMIT) {
    return sendError(res, 429, ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded');
  }
}

