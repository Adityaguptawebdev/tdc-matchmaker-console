import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const handler = (message: string) => ({
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { code: 'RATE_LIMITED', message } },
});

/** Brute-force protection for sign-in: 10 attempts per 15 minutes per IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  ...handler('Too many sign-in attempts. Please wait a few minutes and try again.'),
});

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  ...handler('Too many requests. Please slow down.'),
});

/** AI calls cost money and time; keep them bounded per IP. */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  ...handler('Too many AI requests. Please wait a moment.'),
});
