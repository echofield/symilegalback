// lib/monitoring.ts
import { NextApiRequest, NextApiResponse } from 'next';

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

class MonitoringService {
  // Log des événements métier importants
  logEvent(eventName: string, properties?: any) {
    console.log(`[EVENT] ${eventName}`, properties);
    
    // Custom logging vers votre système
    this.sendToLoggingService({
      timestamp: new Date().toISOString(),
      event: eventName,
      properties,
      environment: process.env.NODE_ENV,
    });
  }

  // Tracking des erreurs
  captureError(error: Error, context?: any) {
    console.error('[ERROR]', error, context);
  }

  // Monitoring des performances
  measurePerformance(name: string, fn: (...args: any[]) => Promise<any>) {
    return async (...args: any[]) => {
      const start = performance.now();
      
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        
        this.logEvent('performance', {
          operation: name,
          duration,
          success: true,
        });
        
        return result;
      } catch (error: any) {
        const duration = performance.now() - start;
        
        this.logEvent('performance', {
          operation: name,
          duration,
          success: false,
          error: error.message,
        });
        
        throw error;
      }
    };
  }

  // Alertes critiques
  sendAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    if (severity === 'critical' || severity === 'high') {
      // Envoyer une notification immédiate
      this.sendNotification({
        message,
        severity,
        timestamp: new Date().toISOString(),
        service: 'symi-legal',
      });
    }
  }

  private async sendToLoggingService(data: any) {
    // Implémenter l'envoi vers votre service de logs
    try {
      // Skip logging service for now - just log to console
      console.log('[MONITORING]', data);
    } catch (error) {
      console.error('Failed to send logs:', error);
    }
  }

  private async sendNotification(alert: any) {
    // Implémenter l'envoi de notifications
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({
          text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
        }),
      });
    }
  }
}

export const monitoring = new MonitoringService();

// Fonctions de monitoring pour compatibilité avec l'ancien code
export function startMonitor(endpoint: string) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  monitoring.logEvent('api_request_start', {
    requestId,
    endpoint,
    timestamp: new Date().toISOString(),
  });
  
  return { requestId, startTime };
}

export function endMonitor(requestId: string, endpoint: string, startTime: number) {
  const duration = Date.now() - startTime;
  
  monitoring.logEvent('api_request_end', {
    requestId,
    endpoint,
    duration,
    timestamp: new Date().toISOString(),
  });
}

export function logAIUsage(requestId: string, endpoint: string, tokens: number, provider: string) {
  monitoring.logEvent('ai_usage', {
    requestId,
    endpoint,
    tokens,
    provider,
    timestamp: new Date().toISOString(),
  });
}

// Health check endpoint
export default async function healthCheck(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
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
  }

  try {
    // Check OpenAI
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    services.openai = response.ok;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
  }

  try {
    // Check Perplexity
    const response = await fetch('https://api.perplexity.ai/health');
    services.perplexity = response.ok;
  } catch (error) {
    console.error('Perplexity health check failed:', error);
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

  // Définir le code de statut HTTP approprié
  const httpStatus = allHealthy ? 200 : someHealthy ? 503 : 500;
  
  res.status(httpStatus).json(status);
}