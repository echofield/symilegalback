import type { NextApiRequest, NextApiResponse } from 'next';
import { withValidation } from '@/lib/validation/middleware';
import {
  GetClausesRequestSchema,
  GetClausesResponseSchema,
  UpdateClauseRequestSchema,
  UpdateClauseResponseSchema,
} from '@/lib/validation/schemas';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { loadContractTemplate, saveContractTemplate } from '@/services/templates/loader';

async function getClausesHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    logger.info(`Getting clauses for contract ${id}`);
    const template = await loadContractTemplate(id as string);
    return res.status(200).json({
      contract_id: id,
      clauses: template.clauses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Failed to get clauses';
    return res.status(status).json({ error: true, message });
  }
}

async function updateClauseHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, clause_id, body, title } = req.body as any;
    logger.info(`Updating clause ${clause_id} for contract ${id}`);
    const template = await loadContractTemplate(id as string);
    const clauseIndex = template.clauses.findIndex((c) => c.id === clause_id);
    if (clauseIndex === -1) {
      throw new AppError('Clause not found', 404);
    }
    if (title) template.clauses[clauseIndex].title = title;
    if (body) template.clauses[clauseIndex].body = body;
    await saveContractTemplate(id as string, template);
    return res.status(200).json({
      contract_id: id,
      clause_id,
      updated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = (error as any)?.statusCode || 500;
    const message = (error as any)?.message || 'Failed to update clause';
    return res.status(status).json({ error: true, message });
  }
}

// Route note: This handler serves both GET and PATCH for /api/contracts/[id]/clauses
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return withValidation(GetClausesRequestSchema, GetClausesResponseSchema, getClausesHandler)(req, res);
  }
  if (req.method === 'PATCH') {
    return withValidation(UpdateClauseRequestSchema, UpdateClauseResponseSchema, updateClauseHandler)(req, res);
  }
  return res.status(405).json({ error: true, message: 'Method not allowed' });
}

