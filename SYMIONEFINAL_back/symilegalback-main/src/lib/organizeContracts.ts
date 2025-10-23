export interface ContractSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  jurisdiction?: string;
  lang: 'fr' | 'en';
  keywords?: string[];
  path?: string;
}

export interface OrganizedContracts {
  fr: Record<string, ContractSummary[]>;
  en: Record<string, ContractSummary[]>;
  flat: ContractSummary[];
}

function sortContracts(a: ContractSummary, b: ContractSummary) {
  return a.title.localeCompare(b.title, a.lang === 'fr' ? 'fr' : 'en', { sensitivity: 'base' });
}

export function organizeContracts(data: { fr: ContractSummary[]; en: ContractSummary[] }): OrganizedContracts {
  const result: OrganizedContracts = { fr: {}, en: {}, flat: [] };
  const langs: Array<'fr' | 'en'> = ['fr', 'en'];

  for (const lang of langs) {
    const contracts = data[lang] ?? [];
    for (const contract of contracts) {
      const bucket = contract.categorySlug || 'autres';
      if (!result[lang][bucket]) {
        result[lang][bucket] = [];
      }
      result[lang][bucket].push(contract);
    }
    for (const key of Object.keys(result[lang])) {
      result[lang][key].sort(sortContracts);
    }
    result.flat.push(...contracts);
  }

  result.flat.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  return result;
}
