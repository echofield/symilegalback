import type { AIAdapter } from '@/types/ai';

export class OpenAIAdapter implements AIAdapter {
  // Placeholder: Assume OpenAI SDK configured via env
  async generate(prompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    // Implement using OpenAI SDK in real integration
    return `OPENAI_OUTPUT:\n${prompt.slice(0, 1200)}`;
  }

  async review(text: string): Promise<any> {
    return { overall_risk: 'medium', red_flags: [], summary: `OpenAI review summary for ${text.slice(0, 64)}...` };
  }

  async explain(text: string): Promise<string> {
    return `OpenAI explanation: ${text.slice(0, 200)}`;
  }
}

