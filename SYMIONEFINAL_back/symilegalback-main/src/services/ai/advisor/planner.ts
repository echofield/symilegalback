import { getAIClient } from '@/services/ai/adapter';
import { AdvisorOutputSchema } from './schema';

// Plans the advisor response (classification + action proposal)
export async function planAdvisorResponse(userQuery: string, context: Record<string, any> = {}): Promise<string> {
  const client = getAIClient();
  const systemPrompt = `You are LEX-ADVISOR, an autonomous legal information agent for the LEX-ENGINE system.\n` +
    `You DO NOT give legal advice. You classify intent, jurisdiction, category, and propose ONE next action.\n` +
    `Output must be valid JSON matching this schema (Typescript/Zod shape):\n${AdvisorOutputSchema.toString()}\n` +
    `Constraints:\n- No legal advice; information and routing only.\n- Keep responses concise.\n- Use the user's language if obvious.\n`;

  const prompt = `${systemPrompt}\n\nUser query:\n${userQuery}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
  const response = await client.generate(prompt);
  return response;
}

