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
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500, code: ErrorCode = ErrorCode.INTERNAL_ERROR) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      error: true,
      message: this.message,
      code: this.code,
    };
  }
}

export function errorHandler(err: any, _req: any, res: any, _next: any) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: true,
      message: 'Validation error',
      code: ErrorCode.VALIDATION_ERROR,
      details: err.errors,
    });
  }

  // Default error
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: true,
    message: 'An unexpected error occurred',
    code: ErrorCode.INTERNAL_ERROR,
  });
}

