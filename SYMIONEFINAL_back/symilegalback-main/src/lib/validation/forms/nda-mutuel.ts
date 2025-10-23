import { z } from 'zod';

export const ndaMutuelSchema = z.object({
  party_a: z.string().min(2),
  party_b: z.string().min(2),
  purpose: z.string().min(3),
  term_months: z.number().int().positive(),
});

export type NDAMutuelInputs = z.infer<typeof ndaMutuelSchema>;


