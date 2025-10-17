export interface AIAdapter {
  generate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
  review(text: string): Promise<any>;
  explain(text: string): Promise<string>;
}

