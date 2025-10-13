import fs from 'fs/promises';
import path from 'path';
import type { ContractIndexEntry, ContractTemplate } from '@/types/contracts';
import { CONTRACTS_DIR, CONTRACTS_INDEX_FILE } from '@/config/constants';
import { AppError, ErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getCacheClient } from '@/services/cache/client';

// Loads the contracts index from disk (cached)
export async function loadContractsIndex(): Promise<ContractIndexEntry[]> {
  const cache = await getCacheClient();
  const cacheKey = 'contracts:index';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const indexPath = path.join(process.cwd(), CONTRACTS_INDEX_FILE);
  const data = await fs.readFile(indexPath, 'utf-8');
  const index = JSON.parse(data) as ContractIndexEntry[];
  await cache.set(cacheKey, JSON.stringify(index), 60);
  return index;
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

