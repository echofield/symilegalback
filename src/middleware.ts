import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function normalize(url: string): string {
  return url.replace(/\/$/, '');
}

function matchesPattern(origin: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
  return re.test(origin);
}

function pickAllowedOrigin(req: NextRequest): string {
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => normalize(s.trim()))
    .filter(Boolean);
  const rawOrigin = req.headers.get('origin') || '';
  const origin = normalize(rawOrigin);
  if (configured.length === 0) return '*';
  if (origin && configured.includes(origin)) return rawOrigin || origin;
  for (const pat of configured) {
    if (pat.includes('*') && origin && matchesPattern(origin, pat)) {
      return rawOrigin || origin;
    }
  }
  if (configured.includes('*')) return '*';
  return configured[0];
}

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    const allowOrigin = pickAllowedOrigin(req);
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400');
    return new NextResponse(null, { status: 204, headers });
  }
  // Ensure all API responses carry ACAO
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const allowOrigin = pickAllowedOrigin(req);
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', allowOrigin);
    res.headers.set('Vary', 'Origin');
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};


