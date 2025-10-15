import type { NextApiResponse } from 'next';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  GENERATION_FAILED = 'GENERATION_FAILED',
  REVIEW_FAILED = 'REVIEW_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  CLAUSE_NOT_FOUND = 'CLAUSE_NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode | string = ErrorCode.INTERNAL_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, AppError);
  }

  toResponse(): ApiErrorResponse {
    return createErrorResponse(this.code, this.message, this.details);
  }
}

export function createErrorResponse(code: string, message: string, details?: unknown): ApiErrorResponse {
  return {
    error: code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

export function sendError(res: NextApiResponse, statusCode: number, code: ErrorCode | string, message: string, details?: unknown) {
  return res.status(statusCode).json(createErrorResponse(code, message, details));
}

export function errorHandler(err: unknown, _req: unknown, res: NextApiResponse, _next: unknown) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toResponse());
  }

  if ((err as any)?.name === 'ZodError') {
    return res.status(400).json(
      createErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation error', (err as any)?.errors ?? (err as any)),
    );
  }

  console.error('Unhandled error:', err);
  return res.status(500).json(createErrorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred'));
}

