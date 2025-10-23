// lib/middleware/api.ts - Enhanced API middleware system
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { withCors, withSecurityHeaders } from '@/lib/http/cors';
import { monitoring } from '@/lib/monitoring';
import { env, isRateLimitDisabled } from '@/config/env';

// Rate limiting (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return function rateLimitMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    if (isRateLimitDisabled()) {
      if (next) next();
      return;
    }

    const clientId = req.headers['x-forwarded-for'] as string || 
                    req.headers['x-real-ip'] as string || 
                    req.connection.remoteAddress || 
                    'unknown';

    const now = Date.now();
    const key = `${clientId}:${req.url}`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      if (next) next();
      return;
    }

    if (current.count >= maxRequests) {
      monitoring.logEvent('rate_limit_exceeded', {
        clientId,
        endpoint: req.url,
        count: current.count,
        limit: maxRequests,
      });
      
      throw AppError.rateLimit(`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s`);
    }

    current.count++;
    if (next) next();
  };
}

// Request logging middleware
export function withLogging() {
  return function loggingMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // Add request ID to headers for tracing
    res.setHeader('X-Request-ID', requestId);

    monitoring.logEvent('api_request_start', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });

    // Override res.end to log completion
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      
      monitoring.logEvent('api_request_end', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
      });

      return originalEnd.call(this, chunk, encoding);
    };

    if (next) next();
  };
}

// Input validation middleware
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return function validationMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    try {
      let data: any;
      
      switch (source) {
        case 'body':
          data = req.body;
          break;
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = { ...req.query, ...req.body };
          break;
      }

      const validatedData = schema.parse(data);
      
      // Attach validated data to request
      (req as any).validatedData = validatedData;
      
      if (next) next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw AppError.validation('Validation failed', error.errors);
      }
      throw error;
    }
  };
}

// Method validation middleware
export function withMethods(allowedMethods: string[]) {
  return function methodMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    if (!allowedMethods.includes(req.method || '')) {
      throw AppError.validation(
        `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
        { allowedMethods, receivedMethod: req.method }
      );
    }
    
    if (next) next();
  };
}

// Feature flag middleware
export function withFeatureFlag(feature: string) {
  return function featureMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    const featureEnabled = process.env[`FEATURE_${feature.toUpperCase()}`] === 'true';
    
    if (!featureEnabled) {
      throw AppError.featureDisabled(feature);
    }
    
    if (next) next();
  };
}

// Environment validation middleware
export function withEnvironmentCheck(requiredVars: string[]) {
  return function envMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw AppError.missingEnv(missing.join(', '));
    }
    
    if (next) next();
  };
}

// Combined middleware factory
export interface ApiMiddlewareOptions {
  cors?: boolean;
  security?: boolean;
  rateLimit?: { maxRequests?: number; windowMs?: number };
  logging?: boolean;
  validation?: { schema: z.ZodSchema; source?: 'body' | 'query' | 'params' };
  methods?: string[];
  featureFlag?: string;
  environment?: string[];
}

export function createApiMiddleware(options: ApiMiddlewareOptions = {}) {
  return function apiMiddleware(handler: any) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Apply middleware in order
        if (options.cors !== false) {
          withCors()(req, res);
        }
        
        if (options.security !== false) {
          withSecurityHeaders(req, res);
        }
        
        if (options.logging !== false) {
          withLogging()(req, res);
        }
        
        if (options.rateLimit) {
          withRateLimit(options.rateLimit.maxRequests, options.rateLimit.windowMs)(req, res);
        }
        
        if (options.methods) {
          withMethods(options.methods)(req, res);
        }
        
        if (options.featureFlag) {
          withFeatureFlag(options.featureFlag)(req, res);
        }
        
        if (options.environment) {
          withEnvironmentCheck(options.environment)(req, res);
        }
        
        if (options.validation) {
          withValidation(options.validation.schema, options.validation.source)(req, res);
        }
        
        // Call the handler
        return await handler(req, res);
        
      } catch (error) {
        monitoring.captureError(error as Error, {
          endpoint: req.url,
          method: req.method,
          requestId: res.getHeader('X-Request-ID'),
        });
        
        throw error;
      }
    };
  };
}

// Convenience functions for common patterns
export const withStandardApi = createApiMiddleware({
  cors: true,
  security: true,
  logging: true,
  rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
});

export const withPublicApi = createApiMiddleware({
  cors: true,
  security: true,
  logging: true,
  rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 },
});

export const withProtectedApi = createApiMiddleware({
  cors: true,
  security: true,
  logging: true,
  rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
});

export const withBondApi = createApiMiddleware({
  cors: true,
  security: true,
  logging: true,
  rateLimit: { maxRequests: 30, windowMs: 15 * 60 * 1000 },
  featureFlag: 'BOND',
});

export const withConseillerApi = createApiMiddleware({
  cors: true,
  security: true,
  logging: true,
  rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 },
  environment: ['OPENAI_API_KEY', 'PERPLEXITY_API_KEY'],
});
