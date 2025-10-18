import { promises as fs } from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src', 'lib', 'data', 'bond-templates.json');

export type BondTemplate = {
  id: string;
  title: string;
  description: string;
  roles: [string, string];
  milestones: Array<{ title: string; description: string; amount: number }>;
  terms: string[];
  risks: string[];
  tags: string[];
};

export async function getBondTemplates(): Promise<BondTemplate[]> {
  const raw = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw) as BondTemplate[];
}

export async function getBondTemplateById(id: string): Promise<BondTemplate | undefined> {
  const all = await getBondTemplates();
  return all.find((t) => t.id === id);
}


