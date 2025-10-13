import type { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Sliding window rate limiter: 5 req/min per IP
export async function rateLimit(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const windowMs = 60 * 1000;
  const limit = 5;
  const now = Date.now();
  const windowStart = now - windowMs;

  const redis = Redis.fromEnv();
  const key = `rl:${ip}`;

  // Clean old timestamps and push current
  await redis.zremrangebyscore(key, 0, windowStart);
  await redis.zadd(key, { score: now, member: `${now}` });
  const count = await redis.zcount(key, windowStart, now);
  await redis.expire(key, 120);

  const remaining = Math.max(0, limit - count);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((windowStart + windowMs - now) / 1000)));

  if (count > limit) {
    return res.status(429).json({ error: true, message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' });
  }
}

