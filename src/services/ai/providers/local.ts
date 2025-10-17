import type { AIAdapter } from '@/types/ai';
import { loadContractTemplate } from '@/services/templates/loader';
import { parseTemplateIdFromPrompt } from '@/services/ai/util';

function renderContractFromPrompt(prompt: string): string {
  // Try to pull the contract id and a JSON inputs block out of the prompt
  const id = parseTemplateIdFromPrompt(prompt);
  let inputs: Record<string, any> = {};
  try {
    const match = prompt.match(/USER INPUTS \(JSON\):\n([\s\S]*?)\n\nBASE CLAUSES/);
    if (match) inputs = JSON.parse(match[1]);
  } catch {}

  if (!id) {
    return `CONTRACT\n\n${prompt.slice(0, 800)}`;
  }

  try {
    const tmpl = loadContractTemplate.sync?.(id);
    if (!tmpl) return `CONTRACT\n\n${prompt.slice(0, 800)}`;

    const header = `${tmpl.metadata.title}\nGoverning law: ${tmpl.metadata.governing_law} • Jurisdiction: ${tmpl.metadata.jurisdiction}\n`;
    const parties = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${String(v ?? '')}`)
      .join('\n');

    const body = tmpl.clauses
      .map((c, i) => `\n${i + 1}. ${c.title}\n${String(c.body || '').replace(/\{\{(.*?)\}\}/g, (_, key) => String(inputs[key.trim()] ?? ''))}`)
      .join('\n');

    return `${header}\n${parties}\n${body}`;
  } catch {
    return `CONTRACT\n\n${prompt.slice(0, 800)}`;
  }
}

export class LocalAdapter implements AIAdapter {
  async generate(prompt: string, _options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    // Produce a readable contract when no external AI provider is configured
    return renderContractFromPrompt(prompt);
  }

  async review(text: string): Promise<any> {
    return { overall_risk: 'low', red_flags: [], summary: `Local review for ${text.slice(0, 64)}...` };
  }

  async explain(text: string): Promise<string> {
    return `Local explanation: ${text.slice(0, 200)}`;
  }
}

