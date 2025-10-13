import crypto from 'crypto';
import { logger } from '@/lib/logger';

export function startMonitor(route: string, meta?: Record<string, any>) {
  const requestId = crypto.randomBytes(6).toString('hex');
  const startTime = Date.now();
  logger.info({ requestId, route, event: 'start', ...(meta || {}) });
  return { requestId, startTime };
}

export function endMonitor(requestId: string, route: string, startTime: number, meta?: Record<string, any>) {
  const duration = Date.now() - startTime;
  logger.info({ requestId, route, duration, event: 'end', ...(meta || {}) });
}

export function logAIUsage(requestId: string, route: string, tokens: number, provider: string) {
  logger.info({ requestId, route, provider, tokens, event: 'ai_usage' });
}

