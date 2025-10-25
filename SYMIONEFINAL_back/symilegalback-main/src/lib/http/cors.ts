// lib/http/cors.ts - Enhanced CORS middleware
import type { NextApiRequest, NextApiResponse } from 'next';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://symifrontlegal.vercel.app',
  'https://symifrontlegalfinal.vercel.app',
  'https://symifrontlegal*.vercel.app',
  'https://symione.vercel.app',
  'https://symione*.vercel.app'
];

export const DEFAULT_ALLOWED_METHODS = [
  'GET',
  'POST', 
  'PUT',
  'DELETE',
  'OPTIONS',
  'PATCH'
];

export const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers'
];

export interface CorsOptions {
  origins?: string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function withCors(options: CorsOptions = {}, handler?: any) {
  return function corsMiddleware(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    const {
      origins = DEFAULT_ALLOWED_ORIGINS,
      methods = DEFAULT_ALLOWED_METHODS,
      headers = DEFAULT_ALLOWED_HEADERS,
      credentials = false,
      maxAge = 86400 // 24 hours
    } = options;

    const origin = req.headers.origin;
    const isAllowedOrigin = origins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*');
        return new RegExp(pattern).test(origin || '');
      }
      return allowedOrigin === origin;
    });

    if (origin && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Access-Control-Max-Age', maxAge.toString());

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (handler) {
      return handler(req, res);
    }

    if (next) {
      next();
    }
  };
}

// Convenience function for wrapping handlers
export function corsHandler(handler: any, options?: CorsOptions) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    withCors(options)(req, res);
    return handler(req, res);
  };
}

// Security headers middleware
export function withSecurityHeaders(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.openai.com https://api.perplexity.ai;"
  );

  if (next) {
    next();
  }
}

// Combined middleware for API routes
export function withApiMiddleware(options?: CorsOptions) {
  return function apiMiddleware(handler: any) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Apply CORS
      withCors(options)(req, res);
      
      // Apply security headers
      withSecurityHeaders(req, res);
      
      // Call the handler
      return handler(req, res);
    };
  };
}