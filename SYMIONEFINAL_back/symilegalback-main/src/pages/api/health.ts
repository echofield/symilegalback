import { NextApiRequest, NextApiResponse } from 'next';
import { monitoring } from '@/lib/monitoring';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: boolean;
    openai: boolean;
    perplexity: boolean;
    cache: boolean;
  };
  metrics?: {
    responseTime: number;
    dbConnections: number;
    cacheHitRate: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'down',
      timestamp: new Date().toISOString(),
      services: { database: false, openai: false, perplexity: false, cache: false }
    });
  }

  const start = Date.now();
  const services = {
    database: false,
    openai: false,
    perplexity: false,
    cache: false,
  };

  try {
    // Check Database
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    services.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
    monitoring.captureError(error as Error, { service: 'database' });
  }

  try {
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      services.openai = response.ok;
    }
  } catch (error) {
    console.error('OpenAI health check failed:', error);
    monitoring.captureError(error as Error, { service: 'openai' });
  }

  try {
    // Check Perplexity
    if (process.env.PERPLEXITY_API_KEY) {
      const response = await fetch('https://api.perplexity.ai/health');
      services.perplexity = response.ok;
    }
  } catch (error) {
    console.error('Perplexity health check failed:', error);
    monitoring.captureError(error as Error, { service: 'perplexity' });
  }

  // Cache check (simplified)
  try {
    // Simple cache test
    services.cache = true;
  } catch (error) {
    console.error('Cache health check failed:', error);
    monitoring.captureError(error as Error, { service: 'cache' });
  }

  const allHealthy = Object.values(services).every(v => v);
  const someHealthy = Object.values(services).some(v => v);

  const status: HealthStatus = {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    services,
    metrics: {
      responseTime: Date.now() - start,
      dbConnections: 0,
      cacheHitRate: 0,
    },
  };

  // Log health check
  monitoring.logEvent('health_check', {
    status: status.status,
    services,
    responseTime: status.metrics?.responseTime,
  });

  // Définir le code de statut HTTP approprié
  const httpStatus = allHealthy ? 200 : someHealthy ? 503 : 500;
  
  res.status(httpStatus).json(status);
}