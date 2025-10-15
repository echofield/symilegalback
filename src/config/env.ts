import { z } from 'zod';
import { AIProvider } from '@/config/aiProviders';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AI_PROVIDER: z.nativeEnum(AIProvider).default(AIProvider.Local),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  LOCAL_LLM_URL: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Invalid environment configuration', parsed.error.flatten());
  throw new Error('Invalid environment configuration');
}

const raw = parsed.data;

const warnings: string[] = [];
if (raw.AI_PROVIDER === AIProvider.OpenAI && !raw.OPENAI_API_KEY) {
  warnings.push('OPENAI_API_KEY is required when AI_PROVIDER=openai');
}

if (raw.AI_PROVIDER === AIProvider.Mistral && !raw.MISTRAL_API_KEY) {
  warnings.push('MISTRAL_API_KEY is required when AI_PROVIDER=mistral');
}

if (!raw.REDIS_URL && !raw.UPSTASH_REDIS_REST_URL) {
  warnings.push('REDIS_URL or UPSTASH_REDIS_REST_URL is not configured. Falling back to in-memory rate limiting.');
}

if (warnings.length) {
  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }
}

export const env = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  aiProvider: raw.AI_PROVIDER,
  openaiApiKey: raw.OPENAI_API_KEY ?? '',
  openaiModel: raw.OPENAI_MODEL ?? 'gpt-4',
  mistralApiKey: raw.MISTRAL_API_KEY ?? '',
  localLlmUrl: raw.LOCAL_LLM_URL ?? '',
  logLevel: raw.LOG_LEVEL,
  redisUrl: raw.REDIS_URL ?? raw.UPSTASH_REDIS_REST_URL ?? '',
  corsOrigin: raw.CORS_ORIGIN ?? '*',
});

