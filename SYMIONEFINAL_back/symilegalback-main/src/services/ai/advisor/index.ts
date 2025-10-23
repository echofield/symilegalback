import { planAdvisorResponse } from './planner';
import { validateAdvisorOutput } from './validator';

// Runs the advisor loop with optional follow-up handling
export async function runAdvisorLoop(query: string, context: Record<string, any> = {}) {
  let plan = await planAdvisorResponse(query, context);
  let validated = await validateAdvisorOutput(plan);

  while (validated.followup_question) {
    // In production, collect the user's answer from the client; here we use context.simulated_answer
    const userAnswer = context.simulated_answer || 'continue';
    plan = await planAdvisorResponse(userAnswer, context);
    validated = await validateAdvisorOutput(plan);
  }

  return validated;
}

