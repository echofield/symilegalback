const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT_DIR, 'contracts');
const OUTPUT_DIR = path.join(ROOT_DIR, 'src', 'lib', 'data');

const CATEGORY_MAP = {
  business: {
    fr: { slug: 'commerce', label: 'Commerce' },
    en: { slug: 'business', label: 'Business' },
  },
  closure: {
    fr: { slug: 'cloture', label: 'Clôture' },
    en: { slug: 'closure', label: 'Business Closure' },
  },
  employment: {
    fr: { slug: 'travail', label: 'Travail' },
    en: { slug: 'employment', label: 'Employment' },
  },
  personal: {
    fr: { slug: 'personnel', label: 'Personnel' },
    en: { slug: 'personal', label: 'Personal' },
  },
  property: {
    fr: { slug: 'baux', label: 'Baux' },
    en: { slug: 'real-estate', label: 'Real Estate' },
  },
};

const FALLBACK_CATEGORY = {
  fr: { slug: 'autres', label: 'Autres' },
  en: { slug: 'general', label: 'General' },
};

function slugFromFilename(file) {
  return file.replace(/\.json$/i, '').toLowerCase();
}

function looksFrench(meta, slug) {
  const jurisdiction = (meta.jurisdiction || '').toLowerCase();
  if (jurisdiction.includes('france') || jurisdiction === 'fr') return true;
  const title = (meta.title || '').toLowerCase();
  if (/à|â|ç|é|è|ê|ë|î|ï|ô|ù|û|ü|œ|contrat|bail|avenant|rupture|attestation/.test(title)) return true;
  if (/contrat|bail|avenant|rupture|attestation/.test(slug)) return true;
  return false;
}

function buildDescription(meta, lang) {
  const law = meta.governing_law || meta.jurisdiction || (lang === 'fr' ? 'la législation locale' : 'local regulations');
  if (lang === 'fr') {
    return `Modèle de ${meta.title.toLowerCase()} conforme au droit ${law}.`;
  }
  return `Template for ${meta.title} compliant with ${law} law.`;
}

function tokenise(input) {
  return (input || '')
    .toLowerCase()
    .split(/[^a-z0-9àâçéèêëîïôùûüÿœ]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values));
}

async function collectContracts() {
  const records = [];

  async function walk(dir, parentCategory) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, entry.name);
        continue;
      }
      if (!entry.name.endsWith('.json')) continue;

      const raw = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.metadata || !data.metadata.title) continue;

      const slug = slugFromFilename(entry.name);
      const lang = looksFrench(data.metadata, slug) ? 'fr' : 'en';
      const categoryConfig = CATEGORY_MAP[parentCategory || ''] || FALLBACK_CATEGORY;
      const category = categoryConfig[lang];

      const keywords = unique([
        ...tokenise(data.metadata.title),
        ...tokenise(slug),
        ...tokenise(data.metadata.jurisdiction),
        ...tokenise(data.metadata.governing_law),
      ]);

      records.push({
        id: slug,
        title: data.metadata.title,
        description: buildDescription(data.metadata, lang),
        category: category.label,
        categorySlug: category.slug,
        jurisdiction: data.metadata.jurisdiction,
        lang,
        keywords,
        path: path.relative(ROOT_DIR, fullPath),
      });
    }
  }

  await walk(CONTRACTS_DIR);
  return records;
}

async function main() {
  const records = await collectContracts();
  const fr = records.filter((r) => r.lang === 'fr').sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const en = records.filter((r) => r.lang === 'en').sort((a, b) => a.title.localeCompare(b.title, 'en'));
  const all = [...fr, ...en].sort((a, b) => a.title.localeCompare(b.title));

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, 'contracts-fr.json'), JSON.stringify(fr, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'contracts-en.json'), JSON.stringify(en, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'all-contracts.json'), JSON.stringify(all, null, 2));

  console.log(`Generated ${fr.length} FR contracts, ${en.length} EN contracts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
