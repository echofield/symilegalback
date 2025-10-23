import fs from 'fs/promises';
import path from 'path';
import type { ContractIndexEntry, ContractTemplate } from '@/types/contracts';
import { CONTRACTS_DIR, CONTRACTS_INDEX_FILE } from '@/config/constants';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getCacheClient } from '@/services/cache/client';
import contractsIndex from '../../../contracts/contracts_index.json';

// Loads the contracts index from disk (cached)
export async function loadContractsIndex(): Promise<ContractIndexEntry[]> {
  // Static import guarantees bundling in serverless and avoids fs in prod
  const cache = await getCacheClient();
  const cacheKey = 'contracts:index';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const index = (contractsIndex as unknown) as ContractIndexEntry[];
  await cache.set(cacheKey, JSON.stringify(index), 60);
  return index;
}

// Builds a language/jurisdiction map (FR|EN) for each template id and caches it
export async function getJurisdictionMap(): Promise<Record<string, 'FR' | 'EN'>> {
  const cache = await getCacheClient();
  const cacheKey = 'contracts:jurisdiction-map';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const index = await loadContractsIndex();
  const result: Record<string, 'FR' | 'EN'> = {};

  // Heuristic: prefer explicit metadata.jurisdiction; fallback to title accents
  for (const entry of index) {
    try {
      const templatePath = path.join(process.cwd(), entry.path.replace(/^\//, ''));
      const raw = await fs.readFile(templatePath, 'utf-8');
      const tpl = JSON.parse(raw) as ContractTemplate;
      const metaJur = String(tpl?.metadata?.jurisdiction || '').toUpperCase();
      let lang: 'FR' | 'EN' = 'EN';
      if (metaJur === 'FR' || metaJur === 'FRANCE' || /FR(\b|$)/.test(metaJur)) {
        lang = 'FR';
      } else {
        // Quick language guess on title
        const title = String(tpl?.metadata?.title || '');
        if (/\b(le|la|les|de|du|des|contrat|avenant|bail|clause)\b/i.test(title)) {
          lang = 'FR';
        }
        if (/[àâäéèêëîïôöùûüç]/i.test(title)) lang = 'FR';
      }
      result[entry.id] = lang;
    } catch (err) {
      // Default to EN on failure to avoid over-filtering
      result[entry.id] = 'EN';
    }
  }

  await cache.set(cacheKey, JSON.stringify(result), 600);
  return result;
}

// Loads a contract template by id via the index (cached)
export async function loadContractTemplate(id: string): Promise<ContractTemplate> {
  const index = await loadContractsIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) throw new AppError('Contract template not found', 404, ErrorCode.TEMPLATE_NOT_FOUND);

  const cache = await getCacheClient();
  const cacheKey = `contracts:template:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const templatePath = path.join(process.cwd(), entry.path.replace(/^\//, ''));
  const raw = await fs.readFile(templatePath, 'utf-8');
  const template = JSON.parse(raw) as ContractTemplate;
  await cache.set(cacheKey, JSON.stringify(template), 60);
  return template;
}

// Saves an updated contract template back to disk and invalidates cache
export async function saveContractTemplate(id: string, template: ContractTemplate): Promise<void> {
  const index = await loadContractsIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) throw new AppError('Contract template not found', 404, ErrorCode.TEMPLATE_NOT_FOUND);

  const templatePath = path.join(process.cwd(), entry.path.replace(/^\//, ''));
  await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf-8');

  const cache = await getCacheClient();
  await cache.del(`contracts:template:${id}`);
  logger.info({ id }, 'Saved contract template and invalidated cache');
}

