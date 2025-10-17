import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { AppError, ErrorCode } from '@/lib/errors';

// Wraps handlers with request/response validation
export function withValidation(
  requestSchema: z.ZodTypeAny,
  responseSchema: z.ZodTypeAny,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void | unknown>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Merge request data for validation convenience
      const payload = {
        ...req.query,
        ...(req.body ?? {}),
      };
      requestSchema.parse(payload);

      const result = await handler(req, res);

      // Only validate JSON responses if available
      if (!res.headersSent && result !== undefined) {
        const validated = responseSchema.safeParse(result);
        if (!validated.success) {
          throw new AppError('Invalid response shape', 500, ErrorCode.INTERNAL_ERROR);
        }
        return res.status(200).json(validated.data);
      }
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        const error = new AppError('Validation error', 400, ErrorCode.VALIDATION_ERROR);
        return res.status(error.statusCode).json(error.toJSON());
      }
      if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON());
      }
      const error = new AppError('Unexpected error', 500, ErrorCode.INTERNAL_ERROR);
      return res.status(error.statusCode).json(error.toJSON());
    }
  };
}

