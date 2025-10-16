import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

const WINDOW_MS = 60 * 1000;
const LIMIT = 5;

// Sliding window rate limiter: 5 req/min per IP
export async function rateLimit(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const redis = Redis.fromEnv();
  const key = `rl:${ip}`;

  // Clean old timestamps and push current
  await redis.zremrangebyscore(key, 0, windowStart);
  await redis.zadd(key, { score: now, member: `${now}` });
  const count = await redis.zcount(key, windowStart, now);
  await redis.expire(key, 120);

  const remaining = Math.max(0, LIMIT - count);
  const resetUnixSeconds = Math.floor((now + WINDOW_MS) / 1000);

  res.setHeader('X-RateLimit-Limit', String(LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetUnixSeconds));

  if (count > LIMIT) {
    const retryInSec = Math.ceil(WINDOW_MS / 1000);
    res.status(429).json({ error: true, message: 'Rate limit exceeded', code: 'RATE_LIMIT', retryInSec });
    return false;
  }

  return true;
}
