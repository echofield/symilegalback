import { Contract, Milestone, Proof, EscrowBatch } from '@prisma/client';

// Base API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: true;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Contract Types
export interface ContractWithMilestones extends Contract {
  milestones: Milestone[];
}

export interface ContractWithDetails extends Contract {
  milestones: (Milestone & { proofs: Proof[] })[];
  escrowBatches: EscrowBatch[];
}

export interface ContractSummary {
  id: string;
  slug: string;
  title: string;
  status: Contract['status'];
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  milestonesCount: number;
  paidCount: number;
  progress: number;
}

// Milestone Types
export interface MilestoneWithProofs extends Milestone {
  proofs: Proof[];
}

export interface MilestoneSummary {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: Milestone['status'];
  dueAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

// Template Types
export interface ContractTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  metadata: {
    title: string;
    description: string;
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedTime: string;
    legalReferences: string[];
  };
  sections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      question: string;
      type: 'text' | 'select' | 'number' | 'date';
      required: boolean;
      options?: string[];
      help?: string;
      legalImplication?: string;
    }>;
  }>;
}

// Question Types
export interface BondQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'number' | 'date';
  required: boolean;
  options?: string[];
  help?: string;
  legalImplication?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  conditional?: {
    dependsOn: string;
    showWhen: any;
  };
}

// API Response Types
export type ContractCreateResponse = ApiResponse<{
  id: string;
  slug: string;
  title: string;
  status: Contract['status'];
  totalAmount: number;
  milestones: Array<{
    id: string;
    title: string;
    amount: number;
  }>;
}>;

export type ContractListResponse = ApiResponse<ContractSummary[]>;

export type ContractDetailResponse = ApiResponse<ContractWithDetails>;

export type MilestoneSubmitResponse = ApiResponse<{
  milestone: {
    id: string;
    status: Milestone['status'];
    submittedAt: string;
  };
}>;

export type MilestoneValidateResponse = ApiResponse<{
  milestone: {
    id: string;
    status: Milestone['status'];
    approvedAt: string;
  };
}>;

export type TemplateListResponse = ApiResponse<ContractTemplate[]>;

export type QuestionListResponse = ApiResponse<BondQuestion[] | Record<string, BondQuestion[]>>;

export type ContractSuggestResponse = ApiResponse<{
  contract: string;
  suggestions?: string[];
}>;

// Frontend Component Types
export interface BondContract {
  id: string;
  title: string;
  totalAmount: number;
  status: 'draft' | 'active' | 'completed' | 'disputed';
  parties: {
    client: string;
    provider: string;
  };
  createdAt: string;
  progress: number;
}

export interface BondMilestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  status: 'upcoming' | 'submitted' | 'validated' | 'paid';
  submittedDate?: string;
  paidDate?: string;
  contractId: string;
}