// lib/validation/schemas.ts - Comprehensive validation schemas
import { z } from 'zod';

// Common schemas
export const IdSchema = z.string().min(1, 'ID is required');
export const EmailSchema = z.string().email('Invalid email format');
export const PhoneSchema = z.string().regex(/^(\+33|0)[1-9](\d{8})$/, 'Invalid French phone number');
export const SiretSchema = z.string().regex(/^\d{14}$/, 'Invalid SIRET format');
export const AmountSchema = z.number().positive('Amount must be positive');
export const CurrencySchema = z.enum(['EUR', 'USD', 'GBP']).default('EUR');

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Contract schemas
export const ContractStatusSchema = z.enum([
  'draft',
  'pending',
  'active',
  'completed',
  'cancelled',
  'disputed'
]);

export const MilestoneStatusSchema = z.enum([
  'pending',
  'in_progress',
  'submitted',
  'approved',
  'rejected',
  'paid'
]);

export const ContractTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  version: z.string(),
  isActive: z.boolean(),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: AmountSchema,
  deadline: z.string().datetime().optional(),
  deliverables: z.array(z.string()).optional(),
  acceptanceCriteria: z.string().optional(),
  status: MilestoneStatusSchema.default('pending'),
});

export const ContractSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  providerId: z.string().min(1, 'Provider ID is required'),
  templateId: z.string().optional(),
  totalAmount: AmountSchema,
  currency: CurrencySchema,
  status: ContractStatusSchema.default('draft'),
  milestones: z.array(MilestoneSchema).min(1, 'At least one milestone is required'),
  jurisdiction: z.string().default('FR'),
  governingLaw: z.string().default('French law'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Request schemas
export const CreateContractRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  templateId: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  providerId: z.string().min(1, 'Provider ID is required'),
  totalAmount: AmountSchema,
  currency: CurrencySchema,
  milestones: z.array(MilestoneSchema).min(1, 'At least one milestone is required'),
  jurisdiction: z.string().default('FR'),
  governingLaw: z.string().default('French law'),
});

export const UpdateContractRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: ContractStatusSchema.optional(),
  milestones: z.array(MilestoneSchema).optional(),
});

export const SubmitMilestoneRequestSchema = z.object({
  milestoneId: z.string().min(1, 'Milestone ID is required'),
  deliverables: z.array(z.string()).min(1, 'At least one deliverable is required'),
  proof: z.string().optional(),
  notes: z.string().optional(),
});

export const ValidateMilestoneRequestSchema = z.object({
  milestoneId: z.string().min(1, 'Milestone ID is required'),
  approved: z.boolean(),
  feedback: z.string().optional(),
});

// AI/Conseiller schemas
export const LegalAnalysisRequestSchema = z.object({
  problem: z.string().min(10, 'Problem description must be at least 10 characters'),
  city: z.string().optional(),
  context: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
});

export const LegalAnalysisResponseSchema = z.object({
  summary: z.string(),
  category: z.string(),
  specialty: z.string(),
  urgency: z.string(),
  complexity: z.string(),
  risks: z.array(z.string()),
  points: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  needsLawyer: z.boolean(),
  lawyerSpecialty: z.string().optional(),
  recommendedTemplateId: z.string().optional(),
  followupQuestions: z.array(z.string()).optional(),
});

// Bond Q&A schemas
export const BondQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['select', 'multiselect', 'text', 'number', 'date', 'conditional']),
  options: z.array(z.string()).optional(),
  validation: z.object({
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  conditions: z.object({
    dependsOn: z.string(),
    showIf: z.any(),
  }).optional(),
  help: z.string().optional(),
  legalImplication: z.string().optional(),
  defaultValue: z.any().optional(),
});

export const BondAnswersSchema = z.record(z.string(), z.any());

export const BondContractRequestSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  answers: BondAnswersSchema,
  clientInfo: z.object({
    name: z.string().min(1, 'Client name is required'),
    email: EmailSchema.optional(),
    address: z.string().optional(),
    siret: SiretSchema.optional(),
  }),
  providerInfo: z.object({
    name: z.string().min(1, 'Provider name is required'),
    email: EmailSchema.optional(),
    address: z.string().optional(),
    siret: SiretSchema.optional(),
  }),
});

// Payment schemas
export const PaymentIntentRequestSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  amount: AmountSchema,
  currency: CurrencySchema,
  description: z.string().optional(),
});

export const PaymentIntentResponseSchema = z.object({
  clientSecret: z.string(),
  paymentIntentId: z.string(),
  amount: AmountSchema,
  currency: CurrencySchema,
  status: z.string(),
});

// Health check schemas
export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down']),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.boolean(),
    openai: z.boolean(),
    perplexity: z.boolean(),
    cache: z.boolean(),
  }),
  metrics: z.object({
    responseTime: z.number(),
    dbConnections: z.number(),
    cacheHitRate: z.number(),
  }).optional(),
});

// Clause schemas
export const GetClausesRequestSchema = z.object({
  contractId: z.string().optional(),
  category: z.string().optional(),
});

export const GetClausesResponseSchema = z.object({
  success: z.boolean(),
  clauses: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    isRequired: z.boolean(),
  })),
});

export const UpdateClauseRequestSchema = z.object({
  clauseId: z.string(),
  content: z.string().optional(),
  isRequired: z.boolean().optional(),
});

export const UpdateClauseResponseSchema = z.object({
  success: z.boolean(),
  clause: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    isRequired: z.boolean(),
  }),
});

// Contract index schemas
export const ContractsIndexEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  jurisdiction: z.string(),
  version: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContractsIndexResponseSchema = z.object({
  success: z.boolean(),
  contracts: z.array(ContractsIndexEntrySchema),
  total: z.number(),
  jurisdictions: z.record(z.string(), z.array(z.string())),
});

// Explain schemas
export const ExplainRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export const ExplainResponseSchema = z.object({
  explanation: z.string(),
  timestamp: z.string().datetime(),
});

// Generate schemas
export const GenerateRequestSchema = z.object({
  // Support both new and legacy field names
  templateId: z.string().min(1, 'Template ID is required').optional(),
  inputs: z.record(z.string(), z.any()).optional(),
  contract_id: z.string().min(1, 'Template ID is required').optional(),
  user_inputs: z.record(z.string(), z.any()).optional(),
  lawyer_mode: z.boolean().optional(),
}).refine((body) => {
  return Boolean(body.templateId || body.contract_id);
}, { message: 'Missing templateId/contract_id' });

export const GenerateResponseSchema = z.object({
  contract: z.string(),
  timestamp: z.string().datetime(),
});

// Review schemas
export const ReviewRequestSchema = z.object({
  contract: z.string().min(1, 'Contract text is required'),
});

export const ReviewResponseSchema = z.object({
  review: z.string(),
  timestamp: z.string().datetime(),
});

// Contract summary schema
export const ContractSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  jurisdiction: z.string(),
  version: z.string(),
  isActive: z.boolean(),
});

// Export all schemas for easy access
export const Schemas = {
  // Common
  Id: IdSchema,
  Email: EmailSchema,
  Phone: PhoneSchema,
  Siret: SiretSchema,
  Amount: AmountSchema,
  Currency: CurrencySchema,
  Pagination: PaginationSchema,
  
  // Contracts
  ContractStatus: ContractStatusSchema,
  MilestoneStatus: MilestoneStatusSchema,
  ContractTemplate: ContractTemplateSchema,
  Milestone: MilestoneSchema,
  Contract: ContractSchema,
  
  // Requests
  CreateContract: CreateContractRequestSchema,
  UpdateContract: UpdateContractRequestSchema,
  SubmitMilestone: SubmitMilestoneRequestSchema,
  ValidateMilestone: ValidateMilestoneRequestSchema,
  
  // AI/Conseiller
  LegalAnalysisRequest: LegalAnalysisRequestSchema,
  LegalAnalysisResponse: LegalAnalysisResponseSchema,
  
  // Bond
  BondQuestion: BondQuestionSchema,
  BondAnswers: BondAnswersSchema,
  BondContractRequest: BondContractRequestSchema,
  
  // Payment
  PaymentIntentRequest: PaymentIntentRequestSchema,
  PaymentIntentResponse: PaymentIntentResponseSchema,
  
  // Health
  HealthStatus: HealthStatusSchema,
  
  // Clauses
  GetClausesRequest: GetClausesRequestSchema,
  GetClausesResponse: GetClausesResponseSchema,
  UpdateClauseRequest: UpdateClauseRequestSchema,
  UpdateClauseResponse: UpdateClauseResponseSchema,
  
  // Contract Index
  ContractsIndexEntry: ContractsIndexEntrySchema,
  ContractsIndexResponse: ContractsIndexResponseSchema,
  
  // Explain
  ExplainRequest: ExplainRequestSchema,
  ExplainResponse: ExplainResponseSchema,
  
  // Generate
  GenerateRequest: GenerateRequestSchema,
  GenerateResponse: GenerateResponseSchema,
  
  // Review
  ReviewRequest: ReviewRequestSchema,
  ReviewResponse: ReviewResponseSchema,
  
  // Contract Summary
  ContractSummary: ContractSummarySchema,
};