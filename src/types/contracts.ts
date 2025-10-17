export interface ContractTemplate {
  metadata: {
    title: string;
    jurisdiction: string;
    governing_law: string;
    version: string;
  };
  inputs: { key: string; label: string; type: string; required: boolean }[];
  clauses: { id: string; title: string; body: string }[];
  annotations?: { clause_id: string; tooltip: string }[];
}

export interface ContractIndexEntry {
  id: string;
  title: string;
  category: string;
  path: string;
}

