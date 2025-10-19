import type { AIAdapter } from '@/types/ai';

export class LocalAdapter implements AIAdapter {
  async generate(prompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    return `LOCAL_OUTPUT:\n${prompt.slice(0, 1200)}`;
  }

  async review(text: string): Promise<any> {
    return { overall_risk: 'low', red_flags: [], summary: `Local review for ${text.slice(0, 64)}...` };
  }

  async explain(text: string): Promise<string> {
    return `Local explanation: ${text.slice(0, 200)}`;
  }
}

