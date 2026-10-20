import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/http';
import { logger } from '../lib/logger';
import { DuplicateKeyError } from '../store/types';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
};

/**
 * Central error handler. Known errors map to precise status codes; anything unexpected is logged
 * server-side and returned as a generic 500 — internal messages and stack traces never leave the API.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof DuplicateKeyError) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists.' } });
    return;
  }
  const typed = err as { type?: string; status?: number };
  if (typed?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
    return;
  }
  if (typed?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
    return;
  }
  if (err?.message === 'Not allowed by CORS') {
    res.status(403).json({ error: { code: 'CORS_REJECTED', message: 'Origin not allowed.' } });
    return;
  }
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
};
