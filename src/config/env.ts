// config/env.ts - Enhanced environment validation
import { z } from 'zod';

const envSchema = z.object({
  // Core environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  PERPLEXITY_API_KEY: z.string().min(1, 'PERPLEXITY_API_KEY is required'),
  AI_PROVIDER: z.enum(['openai', 'perplexity', 'local']).default('openai'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  // Payment
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Security
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),
  JWT_SECRET: z.string().optional(),
  
  // Features
  FEATURE_BOND: z.string().optional(),
  DISABLE_RATE_LIMIT: z.string().optional(),
  DISABLE_MONTHLY_LIMIT: z.string().optional(),
  
  // External Services
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
  
  // Cache
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };

// Helper functions for environment checks
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const hasFeature = (feature: string): boolean => {
  return process.env[`FEATURE_${feature.toUpperCase()}`] === 'true';
};

export const isRateLimitDisabled = (): boolean => {
  return process.env.DISABLE_RATE_LIMIT === 'true';
};

export const isMonthlyLimitDisabled = (): boolean => {
  return process.env.DISABLE_MONTHLY_LIMIT === 'true';
};

// Service availability checks
export const getServiceStatus = () => ({
  database: !!env.DATABASE_URL,
  openai: !!env.OPENAI_API_KEY,
  perplexity: !!env.PERPLEXITY_API_KEY,
  stripe: !!env.STRIPE_SECRET_KEY,
  supabase: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  redis: !!(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL),
  monitoring: !!env.SENTRY_DSN,
});

// Environment-specific configurations
export const getConfig = () => ({
  api: {
    timeout: isProduction ? 30000 : 10000,
    retries: isProduction ? 3 : 1,
  },
  ai: {
    maxTokens: isProduction ? 4000 : 2000,
    temperature: isProduction ? 0.3 : 0.7,
  },
  security: {
    corsOrigins: isProduction 
      ? ['https://symifrontlegal.vercel.app', 'https://symione.vercel.app']
      : ['http://localhost:3000', 'http://localhost:3001'],
  },
  monitoring: {
    enableSentry: isProduction,
    enableDetailedLogs: isDevelopment,
  },
});