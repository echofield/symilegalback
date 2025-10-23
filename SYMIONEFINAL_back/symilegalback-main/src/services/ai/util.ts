export function parseTemplateIdFromPrompt(prompt: string): string | null {
  // The template loader works with contract_id passed separately, but when using the local adapter
  // we embed a hint at the end of the prompt. If absent, return null.
  const m = prompt.match(/TEMPLATE_ID:([^\n]+)/);
  if (!m) return null;
  return m[1]?.trim() || null;
}


