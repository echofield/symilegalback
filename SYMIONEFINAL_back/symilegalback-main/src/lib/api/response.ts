// lib/api/response.ts - Standardized API response formats
import type { NextApiResponse } from 'next';
import { AppError } from '@/lib/errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponseBuilder<T = any> {
  private response: ApiResponse<T> = {
    success: false,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  static success<T>(data: T, meta?: Partial<ApiResponse<T>['meta']>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static error(error: AppError | Error | string, meta?: Partial<ApiResponse['meta']>): ApiResponse {
    const errorObj = typeof error === 'string' 
      ? { message: error, code: 'UNKNOWN_ERROR' }
      : error instanceof AppError
      ? { message: error.message, code: error.code, details: error.details }
      : { message: error.message, code: 'INTERNAL_ERROR' };

    return {
      success: false,
      error: errorObj,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  static paginated<T>(
    data: T[], 
    pagination: PaginationMeta,
    meta?: Partial<ApiResponse<T[]>['meta']>
  ): ApiResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination,
        ...meta,
      },
    };
  }

  // Builder pattern methods
  withData(data: T): this {
    this.response.data = data;
    this.response.success = true;
    return this;
  }

  withError(error: AppError | Error | string): this {
    const errorObj = typeof error === 'string' 
      ? { message: error, code: 'UNKNOWN_ERROR' }
      : error instanceof AppError
      ? { message: error.message, code: error.code, details: error.details }
      : { message: error.message, code: 'INTERNAL_ERROR' };

    this.response.error = errorObj;
    this.response.success = false;
    return this;
  }

  withPagination(pagination: PaginationMeta): this {
    this.response.meta = {
      timestamp: new Date().toISOString(),
      ...this.response.meta,
      pagination,
    };
    return this;
  }

  withRequestId(requestId: string): this {
    this.response.meta = {
      timestamp: new Date().toISOString(),
      ...this.response.meta,
      requestId,
    };
    return this;
  }

  build(): ApiResponse<T> {
    return this.response;
  }
}

// Helper functions for common response patterns
export function sendSuccess<T>(
  res: NextApiResponse, 
  data: T, 
  statusCode: number = 200,
  meta?: Partial<ApiResponse<T>['meta']>
) {
  const response = ApiResponseBuilder.success(data, meta);
  return res.status(statusCode).json(response);
}

export function sendError(
  res: NextApiResponse, 
  error: AppError | Error | string, 
  statusCode?: number,
  meta?: Partial<ApiResponse['meta']>
) {
  const response = ApiResponseBuilder.error(error, meta);
  const code = error instanceof AppError ? error.statusCode : statusCode || 500;
  return res.status(code).json(response);
}

export function sendPaginated<T>(
  res: NextApiResponse,
  data: T[],
  pagination: PaginationMeta,
  statusCode: number = 200,
  meta?: Partial<ApiResponse<T[]>['meta']>
) {
  const response = ApiResponseBuilder.paginated(data, pagination, meta);
  return res.status(statusCode).json(response);
}

// Validation response helpers
export function sendValidationError(
  res: NextApiResponse,
  errors: any[],
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.validation('Validation failed', errors);
  return sendError(res, error, 400, meta);
}

export function sendNotFound(
  res: NextApiResponse,
  resource: string,
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.notFound(resource);
  return sendError(res, error, 404, meta);
}

export function sendUnauthorized(
  res: NextApiResponse,
  message: string = 'Unauthorized',
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.unauthorized(message);
  return sendError(res, error, 401, meta);
}

export function sendForbidden(
  res: NextApiResponse,
  message: string = 'Forbidden',
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.forbidden(message);
  return sendError(res, error, 403, meta);
}

export function sendRateLimit(
  res: NextApiResponse,
  message: string = 'Rate limit exceeded',
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.rateLimit(message);
  return sendError(res, error, 429, meta);
}

export function sendFeatureDisabled(
  res: NextApiResponse,
  feature: string,
  meta?: Partial<ApiResponse['meta']>
) {
  const error = AppError.featureDisabled(feature);
  return sendError(res, error, 503, meta);
}
