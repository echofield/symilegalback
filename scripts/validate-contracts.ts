import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const ContractTemplateSchema = z.object({
  metadata: z.object({
    title: z.string(),
    jurisdiction: z.string(),
    governing_law: z.string(),
    version: z.string(),
  }),
  inputs: z.array(
    z.object({ key: z.string(), label: z.string(), type: z.string(), required: z.boolean() })
  ),
  clauses: z.array(z.object({ id: z.string(), title: z.string(), body: z.string() })),
  annotations: z.array(z.object({ clause_id: z.string(), tooltip: z.string() })).optional(),
});

function kebab(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-');
}

async function rebuildIndex(root: string, contractsDir: string) {
  const categories = ['business', 'employment', 'property', 'closure', 'freelance', 'custom', 'personal'];
  const index: { id: string; title: string; category: string; path: string }[] = [];
  for (const cat of categories) {
    const catPath = path.join(contractsDir, cat);
    try {
      const files = await fs.readdir(catPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const p = path.join(catPath, file);
        const raw = await fs.readFile(p, 'utf-8');
        const json = JSON.parse(raw);
        index.push({ id: kebab(json.metadata?.title || file.replace(/\.json$/, '')), title: json.metadata?.title || file, category: cat, path: `/contracts/${cat}/${file}` });
      }
    } catch {}
  }
  await fs.writeFile(path.join(contractsDir, 'contracts_index.json'), JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

async function main() {
  const root = process.cwd();
  const contractsDir = path.join(root, 'contracts');
  const indexPath = path.join(contractsDir, 'contracts_index.json');
  let index: { id: string; title?: string; path: string; category?: string }[];
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    index = JSON.parse(raw);
  } catch {
    index = await rebuildIndex(root, contractsDir);
  }
  let ok = 0;
  let fail = 0;
  const seenId = new Set<string>();
  const seenTitle = new Set<string>();
  for (const entry of index) {
    const p = path.join(root, entry.path.replace(/^\//, ''));
    try {
      const data = await fs.readFile(p, 'utf-8');
      const json = JSON.parse(data);
      ContractTemplateSchema.parse(json);
      const id = kebab(json.metadata.title);
      const title = json.metadata.title.trim();
      if (seenId.has(id)) {
        // eslint-disable-next-line no-console
        console.warn(`Duplicate id: ${id}`);
      }
      if (seenTitle.has(title)) {
        // eslint-disable-next-line no-console
        console.warn(`Duplicate title: ${title}`);
      }
      seenId.add(id);
      seenTitle.add(title);
      // enforce filename matches id and category matches folder
      const expectedFile = `${id}.json`;
      const actualFile = path.basename(p);
      if (expectedFile !== actualFile) {
        await fs.rename(p, path.join(path.dirname(p), expectedFile)).catch(() => {});
      }
      ok++;
    } catch (e: any) {
      fail++;
      // eslint-disable-next-line no-console
      console.error(`Invalid contract ${entry.id} at ${entry.path}:`, e.message);
    }
  }
  // Lift cap: keep all templates after deterministic sort
  const rebuilt = await rebuildIndex(root, contractsDir);
  let finalIndex = rebuilt
    .map((e) => ({ ...e, id: kebab(e.id) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  await fs.writeFile(indexPath, JSON.stringify(finalIndex, null, 2), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Validation complete. OK=${ok}, FAIL=${fail}, TOTAL_INDEX=${finalIndex.length}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

