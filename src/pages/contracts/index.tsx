import { useEffect, useMemo } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from 'next/link';
import frContracts from '@/lib/data/contracts-fr.json';
import enContracts from '@/lib/data/contracts-en.json';

interface ContractListEntry {
  id: string;
  title: string;
  category: string;
  lang: 'fr' | 'en';
}

interface RawContractEntry {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  lang?: unknown;
}

interface ContractsPageProps {
  contracts: ContractListEntry[];
}

function normaliseContracts(data: unknown, fallbackLang: 'fr' | 'en'): ContractListEntry[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return (data as RawContractEntry[]).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id) {
      return [];
    }

    const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title : id;
    const category =
      typeof entry.category === 'string' && entry.category.trim() ? entry.category : 'Autres';
    const langValue = entry.lang === 'fr' || entry.lang === 'en' ? entry.lang : fallbackLang;

    return [
      {
        id,
        title,
        category,
        lang: langValue,
      },
    ];
  });
}

export const getStaticProps: GetStaticProps<ContractsPageProps> = async () => {
  const allContracts = [
    ...normaliseContracts(frContracts, 'fr'),
    ...normaliseContracts(enContracts, 'en'),
  ];

  allContracts.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));

  return {
    props: {
      contracts: allContracts,
    },
  };
};

function ContractsPage({ contracts }: InferGetStaticPropsType<typeof getStaticProps>) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const sample = contracts.slice(0, 5).map((contract) => contract.id);
      console.log('[contracts] Loaded slug ids sample:', sample);
    }
  }, [contracts]);

  const groupedContracts = useMemo(() => {
    const map = new Map<string, ContractListEntry[]>();

    for (const contract of contracts) {
      const key = contract.category || 'Autres';
      const existing = map.get(key);
      if (existing) {
        existing.push(contract);
      } else {
        map.set(key, [contract]);
      }
    }

    return Array.from(map.entries())
      .map(([category, items]) => {
        const sortedItems = [...items].sort((a, b) =>
          a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
        );
        return [category, sortedItems] as const;
      })
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }));
  }, [contracts]);

  return (
    <main className="container" style={{ paddingBottom: '48px' }}>
      <header className="header">
        <h1 className="title" style={{ fontSize: '28px' }}>
          Bibliothèque de contrats
        </h1>
        <span className="badge">{contracts.length} modèles</span>
      </header>

      <section className="card" style={{ marginBottom: '24px' }}>
        <p className="muted" style={{ margin: 0 }}>
          Consultez nos modèles de contrats classés par catégories. Cliquez sur un modèle pour afficher sa fiche
          détaillée.
        </p>
      </section>

      <div className="grid" style={{ gap: '24px' }}>
        {groupedContracts.map(([category, items]) => (
          <section key={category} className="card" style={{ padding: '20px' }}>
            <header className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{category}</h2>
              <span className="badge" style={{ fontSize: '12px' }}>
                {items.length} {items.length > 1 ? 'modèles' : 'modèle'}
              </span>
            </header>
            <ul className="list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((contract) => (
                <li key={contract.id} style={{ listStyle: 'none', margin: 0 }}>
                  <Link
                    href={`/contracts/${contract.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#fff',
                      transition: 'box-shadow 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{contract.title}</div>
                      <div className="muted" style={{ fontSize: '13px' }}>
                        {contract.category} · {contract.lang.toUpperCase()}
                      </div>
                    </div>
                    <span className="badge" style={{ fontSize: '12px' }}>
                      Ouvrir
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

export default ContractsPage;
