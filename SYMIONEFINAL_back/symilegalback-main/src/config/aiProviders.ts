export enum AIProvider {
  OpenAI = 'openai',
  Mistral = 'mistral',
  Local = 'local',
}

export const AIProviderConfig = {
  [AIProvider.OpenAI]: {
    defaultModel: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.2,
  },
  [AIProvider.Mistral]: {
    defaultModel: 'mistral-large',
    maxTokens: 4000,
    temperature: 0.2,
  },
  [AIProvider.Local]: {
    defaultModel: 'default',
    maxTokens: 4000,
    temperature: 0.2,
  },
} as const;

