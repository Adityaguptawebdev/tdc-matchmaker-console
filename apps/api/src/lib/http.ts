import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { PageMeta } from '@tdc/shared';
import type { ZodType, ZodTypeDef } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);
export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);

/** Validates untrusted input with a Zod schema; throws a 400 with field-level details on failure. */
export function parse<Out>(schema: ZodType<Out, ZodTypeDef, unknown>, data: unknown): Out {
  const result = schema.safeParse(data);
  if (!result.success) {
    const flat = result.error.flatten();
    throw badRequest(result.error.issues[0]?.message ?? 'Invalid request', {
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
  }
  return result.data;
}

/** Wraps async handlers so rejected promises reach the central error handler (Express 4). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function ok<T>(res: Response, data: T, status = 200, meta?: PageMeta): void {
  res.status(status).json(meta ? { data, meta } : { data });
}

export function pageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; meta: PageMeta } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), meta: pageMeta(page, pageSize, items.length) };
}
