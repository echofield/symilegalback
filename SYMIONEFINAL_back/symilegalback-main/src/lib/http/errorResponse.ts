import type { NextApiResponse } from 'next';

export interface StandardErrorResponse {
  error: true;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface StandardSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  timestamp: string;
}

export function sendErrorResponse(
  res: NextApiResponse,
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>
) {
  const response: StandardErrorResponse = {
    error: true,
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
  
  return res.status(statusCode).json(response);
}

export function sendSuccessResponse<T>(
  res: NextApiResponse,
  data?: T,
  message?: string
) {
  const response: StandardSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  
  return res.status(200).json(response);
}

// Common error responses
export const ERROR_RESPONSES = {
  METHOD_NOT_ALLOWED: (res: NextApiResponse, allowedMethods: string[] = ['GET', 'POST']) =>
    sendErrorResponse(res, 405, `Method not allowed. Allowed: ${allowedMethods.join(', ')}`, 'METHOD_NOT_ALLOWED'),
  
  VALIDATION_ERROR: (res: NextApiResponse, details: Record<string, unknown>) =>
    sendErrorResponse(res, 400, 'Validation failed', 'VALIDATION_ERROR', details),
  
  NOT_FOUND: (res: NextApiResponse, resource: string = 'Resource') =>
    sendErrorResponse(res, 404, `${resource} not found`, 'NOT_FOUND'),
  
  INTERNAL_ERROR: (res: NextApiResponse, message: string = 'Internal server error') =>
    sendErrorResponse(res, 500, message, 'INTERNAL_ERROR'),
  
  UNAUTHORIZED: (res: NextApiResponse, message: string = 'Unauthorized') =>
    sendErrorResponse(res, 401, message, 'UNAUTHORIZED'),
  
  FORBIDDEN: (res: NextApiResponse, message: string = 'Forbidden') =>
    sendErrorResponse(res, 403, message, 'FORBIDDEN'),
  
  RATE_LIMITED: (res: NextApiResponse, retryAfter?: number) =>
    sendErrorResponse(res, 429, 'Rate limit exceeded', 'RATE_LIMITED', { retryAfter }),
};
