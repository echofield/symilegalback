import { z } from 'zod';

// Permissive CDD form schema; accepts any object payload
export const cddSchema = z.object({}).passthrough();

import { z } from 'zod';

export const cddSchema = z.object({
  employeur_nom: z.string().min(2, 'Nom employeur requis'),
  salarie_nom: z.string().min(2, 'Nom salarié requis'),
  motif: z.string().min(3, 'Motif requis'),
  poste: z.string().min(2, 'Poste requis'),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Format AAAA-MM-JJ'),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Format AAAA-MM-JJ'),
  remuneration: z.number({ invalid_type_error: 'Montant numérique requis' }).positive('Doit être > 0'),
});

export type CDDInputs = z.infer<typeof cddSchema>;


