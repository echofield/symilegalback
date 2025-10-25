import { z as zod } from 'zod';

export const stageSchema = zod.object({}).passthrough();

import { z } from 'zod';

export const stageSchema = z.object({
  organisme_accueil: z.string().min(2),
  etablissement_enseignement: z.string().min(2),
  stagiaire_nom: z.string().min(2),
  formation_suivie: z.string().min(2),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  gratification: z.number().nonnegative().optional(),
});

export type StageInputs = z.infer<typeof stageSchema>;


