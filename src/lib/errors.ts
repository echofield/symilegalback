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
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_ENVIRONMENT = 'MISSING_ENVIRONMENT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR'
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    message: string, 
    statusCode: number = 500, 
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      error: true,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }

  // Static factory methods for common errors
  static validation(message: string, details?: any) {
    return new AppError(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }

  static notFound(resource: string) {
    return new AppError(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new AppError(message, 401, ErrorCode.AUTHENTICATION_ERROR);
  }

  static forbidden(message: string = 'Forbidden') {
    return new AppError(message, 403, ErrorCode.AUTHORIZATION_ERROR);
  }

  static rateLimit(message: string = 'Rate limit exceeded') {
    return new AppError(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }

  static externalService(service: string, details?: any) {
    return new AppError(
      `External service error: ${service}`, 
      502, 
      ErrorCode.EXTERNAL_SERVICE_ERROR, 
      details
    );
  }

  static database(message: string, details?: any) {
    return new AppError(message, 500, ErrorCode.DATABASE_ERROR, details);
  }

  static missingEnv(variable: string) {
    return new AppError(
      `Missing required environment variable: ${variable}`, 
      500, 
      ErrorCode.MISSING_ENVIRONMENT
    );
  }

  static aiService(service: string, details?: any) {
    return new AppError(
      `AI service error: ${service}`, 
      502, 
      ErrorCode.AI_SERVICE_ERROR, 
      details
    );
  }

  static featureDisabled(feature: string) {
    return new AppError(
      `Feature disabled: ${feature}`, 
      503, 
      ErrorCode.FEATURE_DISABLED
    );
  }
}

export function errorHandler(err: any, _req: any, res: any, _next: any) {
  // Log error for debugging
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    details: err.details,
    timestamp: new Date().toISOString()
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err?.name === 'ZodError') {
    const error = AppError.validation('Validation error', err.errors);
    return res.status(error.statusCode).json(error.toJSON());
  }

  if (err?.name === 'PrismaClientKnownRequestError') {
    const error = AppError.database('Database operation failed', {
      code: err.code,
      meta: err.meta
    });
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Default error
  const error = new AppError(
    'An unexpected error occurred', 
    500, 
    ErrorCode.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
  
  return res.status(error.statusCode).json(error.toJSON());
}

// Error boundary for async functions
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next?: any) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      errorHandler(err, req, res, next);
    });
  };
}