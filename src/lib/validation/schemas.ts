import { z } from 'zod';

export const GenerateRequestSchema = z.object({
  contract_id: z.string(),
  user_inputs: z.record(z.any()),
  lawyer_mode: z.boolean().optional().default(false),
});

export const GenerateResponseSchema = z.object({
  contract_id: z.string(),
  generated_text: z.string(),
  timestamp: z.string(),
  lawyer_mode: z.boolean(),
});

export const GetClausesRequestSchema = z.object({
  id: z.string(),
});

export const GetClausesResponseSchema = z.object({
  contract_id: z.string(),
  clauses: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      annotations: z.record(z.any()).optional(),
    }),
  ),
  timestamp: z.string(),
});

export const UpdateClauseRequestSchema = z.object({
  id: z.string(),
  clause_id: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
});

export const UpdateClauseResponseSchema = z.object({
  contract_id: z.string(),
  clause_id: z.string(),
  updated: z.boolean(),
  timestamp: z.string(),
});

export const ReviewRequestSchema = z.object({
  contract_text: z.string(),
});

export const ReviewResponseSchema = z.object({
  overall_risk: z.enum(['low', 'medium', 'high']),
  red_flags: z.array(
    z.object({
      clause: z.string(),
      issue: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      suggestion: z.string(),
    }),
  ),
  summary: z.string(),
  timestamp: z.string(),
});

export const ExportRequestSchema = z.object({
  contract_text: z.string(),
  format: z.enum(['pdf', 'docx']),
  html: z.string().optional(),
  metadata: z
    .object({
      version: z.string().optional(),
      author: z.string().optional(),
      date: z.string().optional(),
      review_status: z.string().optional(),
    })
    .optional(),
});

export const ExplainRequestSchema = z.object({
  text: z.string(),
  context: z.string().optional(),
});

export const ExplainResponseSchema = z.object({
  explanation: z.string(),
  timestamp: z.string(),
});

export const ContractsIndexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  path: z.string(),
  jurisdiction: z.string().optional(),
});

export const ContractSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  categorySlug: z.string(),
  jurisdiction: z.string().optional(),
  lang: z.enum(['fr', 'en']),
  keywords: z.array(z.string()).optional(),
  path: z.string().optional(),
});

export const ContractTemplateSchema = z.object({
  metadata: z.object({
    title: z.string(),
    jurisdiction: z.string(),
    governing_law: z.string(),
    version: z.string(),
  }),
  inputs: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.string(),
      required: z.boolean(),
    }),
  ),
  clauses: z.array(
    z.object({ id: z.string(), title: z.string(), body: z.string() }),
  ),
  annotations: z
    .array(z.object({ clause_id: z.string(), tooltip: z.string() }))
    .optional(),
});

