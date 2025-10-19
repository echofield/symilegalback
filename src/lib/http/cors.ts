import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

function normalize(url: string): string {
        return url.replace(/\/$/, '');
}

function matchesPattern(origin: string, pattern: string): boolean {
        // Support '*' wildcard anywhere in pattern
        // Escape regex then replace \* with '.*'
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
        return re.test(origin);
}

const DEFAULT_ALLOWED_ORIGINS = [
        'https://symilegal.vercel.app',
        'https://symifrontlegalfinal.vercel.app',
        'https://symifrontlegal.vercel.app',
        'https://app.symilegal.com',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
];

function getAllowedOrigin(req: NextApiRequest): string {
        const configured = (process.env.CORS_ORIGIN || '')
                .split(',')
                .map((s) => normalize(s.trim()))
                .filter(Boolean);
        if (configured.length === 0) {
                configured.push(...DEFAULT_ALLOWED_ORIGINS);
        }
        const rawOrigin = (req.headers.origin as string) || '';
        const origin = normalize(rawOrigin);
        if (origin && configured.includes(origin)) return rawOrigin || origin;
        // support wildcard patterns like https://app-*.vercel.app
        for (const pat of configured) {
                if (pat.includes('*') && origin && matchesPattern(origin, pat)) {
                        return rawOrigin || origin;
                }
        }
        if (configured.includes('*')) return '*';
	// fallback to the first configured origin (normalized)
	return configured[0];
}

export function withCors(handler: NextApiHandler): NextApiHandler {
	return async function corsWrapped(req: NextApiRequest, res: NextApiResponse) {
		const allowOrigin = getAllowedOrigin(req);
		res.setHeader('Access-Control-Allow-Origin', allowOrigin);
		res.setHeader('Vary', 'Origin');
		res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.setHeader('Access-Control-Max-Age', '86400');

		if (req.method === 'OPTIONS') {
			return res.status(204).end();
		}

		return handler(req, res);
	};
}


