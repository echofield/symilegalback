import { getAIClient } from '@/services/ai/adapter';
import { AdvisorOutputSchema } from './schema';

// Validates and repairs advisor outputs to strict JSON
export async function validateAdvisorOutput(rawOutput: string) {
  try {
    const parsed = JSON.parse(rawOutput);
    const validated = AdvisorOutputSchema.parse(parsed);
    return validated;
  } catch (_err) {
    const deepseek = getAIClient();
    const repairPrompt = `You are the validator for LEX-ADVISOR.\n` +
      `Fix and return valid JSON according to this schema:\n${AdvisorOutputSchema.toString()}\n` +
      `Input (may be invalid JSON):\n${rawOutput}`;
    const fixed = await deepseek.generate(repairPrompt);
    const parsed = JSON.parse(fixed);
    return AdvisorOutputSchema.parse(parsed);
  }
}

