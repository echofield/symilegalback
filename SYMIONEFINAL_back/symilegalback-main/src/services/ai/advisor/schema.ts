import { z } from 'zod';

export const AdvisorActionSchema = z.object({
  type: z.enum(['triage', 'generate_contract', 'review', 'explain', 'search_lawyers', 'none']),
  args: z.record(z.any()).optional(),
});

export const AdvisorOutputSchema = z.object({
  thought: z.string(),
  followup_question: z.string().nullable(),
  action: AdvisorActionSchema,
  reply_text: z.string(),
});

export type AdvisorOutput = z.infer<typeof AdvisorOutputSchema>;

