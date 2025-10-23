import { DOCUMENTS_PRICING } from '@/config/pricing';
import { generatePdfBuffer } from '@/services/export/pdf';

type DocumentFormData = Record<string, unknown>;

export async function generateDocument(documentType: string, formData: DocumentFormData) {
  const documentConfig = DOCUMENTS_PRICING[documentType];

  if (!documentConfig) {
    throw new Error(`Document inconnu: ${documentType}`);
  }

  const prettyFormData = Object.entries(formData || {})
    .map(([key, value]) => `- ${key}: ${formatValue(value)}`)
    .join('\n');

  const content = [
    `Document généré: ${documentConfig.name}`,
    '',
    'Informations fournies :',
    prettyFormData || '- Aucune donnée fournie',
  ].join('\n');

  const pdfBuffer = await generatePdfBuffer(content, {
    header: `${documentConfig.name} — ${new Date().toLocaleDateString('fr-FR')}`,
    footer: 'Document généré automatiquement par SYMIONE',
  });

  const base64 = pdfBuffer.toString('base64');
  return `data:application/pdf;base64,${base64}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${formatValue(val)}`)
      .join(', ');
  }
  return JSON.stringify(value);
}
