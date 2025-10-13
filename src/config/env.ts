export const env = {
  aiProvider: process.env.AI_PROVIDER || 'local',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4',
  mistralApiKey: process.env.MISTRAL_API_KEY || '',
  localLlmUrl: process.env.LOCAL_LLM_URL || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || '',
};

