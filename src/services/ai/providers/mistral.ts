import type { AIAdapter } from '@/types/ai';

export class MistralAdapter implements AIAdapter {
  async generate(prompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    return `MISTRAL_OUTPUT:\n${prompt.slice(0, 1200)}`;
  }

  async review(text: string): Promise<any> {
    return { overall_risk: 'medium', red_flags: [], summary: `Mistral review summary for ${text.slice(0, 64)}...` };
  }

  async explain(text: string): Promise<string> {
    return `Mistral explanation: ${text.slice(0, 200)}`;
  }
}

