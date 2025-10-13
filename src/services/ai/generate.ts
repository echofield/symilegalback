import type { ContractTemplate } from '@/types/contracts';

// Builds the AI prompt from template and inputs; supports lawyer mode
export function buildPrompt(
  template: ContractTemplate,
  userInputs: Record<string, any>,
  lawyerMode: boolean = false,
): string {
  const { metadata, clauses } = template;

  let prompt = `You are an expert contract drafting assistant. Draft the contract titled "${metadata.title}" for jurisdiction ${metadata.jurisdiction} under governing law ${metadata.governing_law}. Use the inputs and clauses as guidance and produce a cohesive contract.`;

  prompt += `\n\nUSER INPUTS (JSON):\n${JSON.stringify(userInputs, null, 2)}`;

  prompt += `\n\nBASE CLAUSES (JSON):\n${JSON.stringify(
    clauses.map((c) => ({ id: c.id, title: c.title, body: c.body })),
    null,
    2,
  )}`;

  if (lawyerMode) {
    prompt += `\n\nLAWYER MODE INSTRUCTIONS:\n`;
    prompt += `- Use precise legal terminology appropriate for ${metadata.jurisdiction} jurisdiction\n`;
    prompt += `- Include detailed annotations explaining the legal significance of each clause\n`;
    prompt += `- Provide alternative phrasing options for key clauses\n`;
    prompt += `- Include preliminary risk assessments for clauses that may require further review\n`;
  } else {
    prompt += `\n\nSTANDARD MODE INSTRUCTIONS:\n`;
    prompt += `- Use clear, understandable language suitable for non-lawyers\n`;
    prompt += `- Focus on practical application rather than legal theory\n`;
    prompt += `- Avoid unnecessary legal jargon\n`;
  }

  prompt += `\n\nOUTPUT REQUIREMENTS:\n- Return the contract as plain text, organized with headings.\n- Do not include the JSON from above.\n- Incorporate user inputs in the appropriate places.\n`;

  return prompt;
}

