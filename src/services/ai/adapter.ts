import { AIProvider } from '@/config/aiProviders';
import { AIAdapter } from '@/types/ai';
import { OpenAIAdapter } from './providers/openai';
import { MistralAdapter } from './providers/mistral';
import { LocalAdapter } from './providers/local';
import { env } from '@/config/env';

// Factory function to get the appropriate AI client based on environment configuration
export function getAIClient(): AIAdapter {
  const provider = env.aiProvider ?? AIProvider.Local;

  switch (provider) {
    case AIProvider.OpenAI:
      return new OpenAIAdapter();
    case AIProvider.Mistral:
      return new MistralAdapter();
    case AIProvider.Local:
    default:
      return new LocalAdapter();
  }
}

