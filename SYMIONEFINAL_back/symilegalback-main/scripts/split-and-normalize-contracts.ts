/*
  Script: Split grouped JSONs and normalize into individual contract files and index.
*/
import fs from 'fs/promises';
import path from 'path';

type RawGroup = string; // file content string containing multiple JSON objects delimited by ```json fences or back-to-back

interface ContractTemplate {
  metadata: { title: string; jurisdiction: string; governing_law: string; version: string };
  inputs: { key: string; label: string; type: string; required: boolean }[];
  clauses: { id: string; title: string; body: string }[];
  annotations?: { clause_id: string; tooltip: string }[];
}

function slugifyId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function normalizeKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = k
        .replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .toLowerCase();
      out[key] = normalizeKeys(v);
    }
    return out;
  }
  return obj;
}

function parseGroupedJson(content: string): any[] {
  const results: any[] = [];

  // 1) Prefer fenced JSON blocks
  const fenceRe = /```json\s*([\s\S]*?)\s*```/gim;
  const fenced: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(content))) {
    fenced.push(match[1]);
  }
  if (fenced.length > 0) {
    for (const block of fenced) {
      const trimmed = block.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) results.push(...parsed);
        else results.push(parsed);
      } catch {
        try {
          const fixed = trimmed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          const parsed = JSON.parse(fixed);
          if (Array.isArray(parsed)) results.push(...parsed);
          else results.push(parsed);
        } catch {
          // skip
        }
      }
    }
    if (results.length > 0) return results;
  }

  // 2) If whole content is a JSON array or object
  const cleanedAll = content.trim();
  if (cleanedAll.startsWith('[') || cleanedAll.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanedAll);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {}
  }

  // 3) Fallback: scan for standalone JSON objects ignoring headings
  const text = content;
  const segments: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        segments.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (const seg of segments) {
    try {
      results.push(JSON.parse(seg));
    } catch {
      try {
        const fixed = seg.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        results.push(JSON.parse(fixed));
      } catch {}
    }
  }
  return results;
}

function categorize(title: string): string {
  const t = title.toLowerCase();
  if (/(freelance|retainer|statement of work|sow|collaboration|consult|vendor|distribution|partnership|joint venture|terms of service|io u|iou|loan|letter of intent|mou)/.test(t)) return 'business';
  if (/(employment|employee|internship|non-compete|ip & invention|offer|termination|contractor to employee)/.test(t)) return 'employment';
  if (/(settlement|release|cease|refund|chargeback|amendment|termination notice|donation|memorandum of understanding|letter of intent)/.test(t)) return 'closure';
  if (/(property|lease|tenancy|real estate|rental|lodger|management|host|guest|event space|equipment|maintenance|cleaning|handyman)/.test(t)) return 'property';
  return 'business';
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(filePath: string, data: any) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  const root = process.cwd();
  const groupedFiles = [
    '10contracts.json',
    'Employment + Personal.json',
    'proprety agreement.json',
    '41️⃣ Settlement Agreement.json',
    'Joint Venture Term Sheet.json',
    '1️⃣ Freelance Services Agreement.json',
  ];

  const outRoot = path.join(root, 'contracts');
  // Clean existing structured dirs to ensure fresh, consistent ids and paths
  const categories = ['freelance', 'business', 'employment', 'property', 'closure', 'custom'];
  for (const c of categories) {
    try { await fs.rm(path.join(outRoot, c), { recursive: true, force: true }); } catch {}
  }
  for (const c of categories) await ensureDir(path.join(outRoot, c));

  const index: { id: string; title: string; category: string; path: string }[] = [];

  for (const file of groupedFiles) {
    const filePath = path.join(root, file);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const items = parseGroupedJson(content);
      for (const raw of items) {
        const n = normalizeKeys(raw) as ContractTemplate;
        const title = n.metadata?.title;
        if (!title) continue;
        const id = slugifyId(title);
        const category = categorize(title);
        const relPath = `/contracts/${category}/${id}.json`;
        const outPath = path.join(root, relPath.replace(/^\//, ''));
        const normalized: ContractTemplate = {
          metadata: {
            title: title,
            jurisdiction: n.metadata?.jurisdiction || '',
            governing_law: n.metadata?.governing_law || '',
            version: n.metadata?.version || '1.0.0',
          },
          inputs: (n.inputs || []).map((i) => ({
            key: i.key,
            label: i.label,
            type: i.type,
            required: Boolean(i.required),
          })),
          clauses: (n.clauses || []).map((c) => ({ id: c.id, title: c.title, body: c.body })),
          annotations: (n.annotations || []).map((a) => ({ clause_id: a.clause_id, tooltip: a.tooltip })),
        };
        // write file
        await writeJson(outPath, normalized);
        index.push({ id, title, category, path: relPath });
      }
    } catch {
      // skip missing group file
    }
  }

  // de-duplicate index by id (keep first occurrence)
  const seen = new Set<string>();
  const deduped = index.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  await writeJson(path.join(outRoot, 'contracts_index.json'), deduped);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${deduped.length} contracts and index at contracts/contracts_index.json`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

