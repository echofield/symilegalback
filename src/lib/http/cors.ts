import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

function getAllowedOrigin(req: NextApiRequest): string {
	const configured = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
	const origin = (req.headers.origin as string) || '';
	if (configured.length === 0) return '*';
	if (origin && configured.includes(origin)) return origin;
	// fallback to the first configured origin
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


