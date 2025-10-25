import type { ContractSummary } from './organizeContracts';

function normalise(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function tokenize(text: string): string[] {
  return normalise(text)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function keywordScore(contract: ContractSummary, queryTokens: string[]): number {
  let score = 0;
  const title = normalise(contract.title);
  const description = normalise(contract.description);
  const category = normalise(contract.category);
  const keywordSet = new Set((contract.keywords ?? []).map(normalise));

  for (const token of queryTokens) {
    if (!token) continue;
    if (title.includes(token)) score += 5;
    if (description.includes(token)) score += 3;
    if (category.includes(token)) score += 2;
    if (keywordSet.has(token)) score += 2;
    if (contract.categorySlug && contract.categorySlug.includes(token)) score += 2;
  }

  return score;
}

function bonusForLanguage(contract: ContractSummary, query: string): number {
  if (contract.lang === 'fr' && /[éèêàçîïôûùœ]/i.test(query)) return 1.5;
  if (contract.lang === 'en' && /[a-z]{3,}/i.test(query) && !/[éèêàçîïôûùœ]/i.test(query)) return 1.5;
  return 0;
}

export function findRelevantContracts(contracts: ContractSummary[], query: string): ContractSummary[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  const results = contracts
    .map((contract) => {
      const score = keywordScore(contract, tokens) + bonusForLanguage(contract, trimmed);
      return { contract, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.contract.title.localeCompare(b.contract.title, undefined, { sensitivity: 'base' });
    })
    .slice(0, 5)
    .map(({ contract }) => contract);

  return results;
}
