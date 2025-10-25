export const CONTRACTS_DIR = 'contracts';
export const CONTRACTS_INDEX_FILE = 'contracts/contracts_index.json';
export const EXPORTS_DIR = 'public/exports';
export const SUPPORTED_JURISDICTIONS = ['UK', 'US'] as const;
export const DEFAULT_GOVERNING_LAWS: Record<(typeof SUPPORTED_JURISDICTIONS)[number], string> = {
  UK: 'England & Wales',
  US: 'California',
};

