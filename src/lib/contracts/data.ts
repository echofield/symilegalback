import frContracts from '@/lib/data/contracts-fr.json';
import enContracts from '@/lib/data/contracts-en.json';

export type Jurisdiction = 'FR' | 'EN';

type RawContractRecord = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  categorySlug?: unknown;
  jurisdiction?: unknown;
  lang?: unknown;
  keywords?: unknown;
  path?: unknown;
};

export interface NormalizedContractRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  path: string;
  sourcePath: string;
  lang: 'fr' | 'en';
  jurisdiction: Jurisdiction;
  keywords: string[];
}

function toArray(data: unknown): RawContractRecord[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((entry): entry is RawContractRecord => Boolean(entry) && typeof entry === 'object');
}

function normalisePath(rawPath: string | undefined): string {
  if (!rawPath) {
    return '';
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normaliseLang(input: unknown, jurisdiction: Jurisdiction): 'fr' | 'en' {
  if (input === 'fr' || input === 'en') {
    return input;
  }

  return jurisdiction === 'FR' ? 'fr' : 'en';
}

function normaliseKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normaliseCategory(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return 'Général';
}

function normaliseDescription(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

function normaliseJurisdiction(value: unknown, fallback: Jurisdiction): Jurisdiction {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (upper === 'FR' || upper === 'FRANCE') {
      return 'FR';
    }
    if (upper === 'EN' || upper === 'UK' || upper === 'ENGLAND' || upper === 'ENGLAND & WALES') {
      return 'EN';
    }
  }

  return fallback;
}

function toNormalizedRecord(entry: RawContractRecord, fallback: Jurisdiction): NormalizedContractRecord | null {
  const id = typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : null;
  const title = typeof entry.title === 'string' && entry.title.trim().length > 0 ? entry.title.trim() : null;
  const sourcePath = normalisePath(typeof entry.path === 'string' ? entry.path : undefined);

  if (!id || !title || !sourcePath) {
    return null;
  }

  const jurisdiction = normaliseJurisdiction(entry.jurisdiction, fallback);

  return {
    id,
    title,
    description: normaliseDescription(entry.description),
    category: normaliseCategory(entry.category),
    path: `/contracts/${id}`,
    sourcePath,
    lang: normaliseLang(entry.lang, jurisdiction),
    jurisdiction,
    keywords: normaliseKeywords(entry.keywords),
  };
}

function buildMap(): Record<Jurisdiction, NormalizedContractRecord[]> {
  return {
    FR: toArray(frContracts)
      .map((entry) => toNormalizedRecord(entry, 'FR'))
      .filter((entry): entry is NormalizedContractRecord => Boolean(entry)),
    EN: toArray(enContracts)
      .map((entry) => toNormalizedRecord(entry, 'EN'))
      .filter((entry): entry is NormalizedContractRecord => Boolean(entry)),
  };
}

const CONTRACT_CACHE = buildMap();

export function getContractsForJurisdiction(jurisdiction: Jurisdiction): NormalizedContractRecord[] {
  return CONTRACT_CACHE[jurisdiction];
}

export function getAllContracts(): NormalizedContractRecord[] {
  return [...CONTRACT_CACHE.FR, ...CONTRACT_CACHE.EN];
}

export function findContractById(id: string, jurisdiction?: Jurisdiction): NormalizedContractRecord | undefined {
  const target = id.trim().toLowerCase();
  if (jurisdiction) {
    return getContractsForJurisdiction(jurisdiction).find((contract) => contract.id.toLowerCase() === target);
  }

  return getAllContracts().find((contract) => contract.id.toLowerCase() === target);
}

export function parseJurisdictionParam(value: unknown): Jurisdiction | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const upper = value.trim().toUpperCase();
  if (upper === 'FR' || upper === 'FRANCE') {
    return 'FR';
  }
  if (upper === 'EN' || upper === 'UK' || upper === 'ENGLAND') {
    return 'EN';
  }

  return undefined;
}
