import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

// Empty values (e.g. `COOKIE_SECURE=` in a .env file) fall back to the default.
const bool = (def: boolean) =>
  z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((v) => (v === undefined ? def : v === 'true' || v === '1')),
  );

const nodeEnv = (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test';
const isProd = nodeEnv === 'production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATA_STORE: z.enum(['auto', 'mongo', 'file', 'memory']).default('auto'),
  MONGODB_URI: z.string().optional(),
  MONGO_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  FILE_DB_PATH: z.string().default('./data/db.json'),
  JWT_SECRET: z.string().optional(),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(72).default(8),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: bool(isProd),
  TRUST_PROXY: bool(false),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  EMAIL_PROVIDER: z.enum(['mock']).default('mock'),
  MATCHING_ASSIGNMENT_RULES: bool(true),
  MATCHING_MIN_SCORE: z.coerce.number().min(0).max(100).default(50),
  SHOW_DEMO_CREDENTIALS: bool(!isProd),
  AUTO_SEED: bool(true),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const raw = parsed.data;

let jwtSecret = raw.JWT_SECRET ?? '';
if (jwtSecret.length < 32) {
  if (raw.NODE_ENV === 'production') {
    console.error('JWT_SECRET must be set to at least 32 characters in production.');
    process.exit(1);
  }
  // Development convenience only: sessions will not survive a restart.
  jwtSecret = crypto.randomBytes(48).toString('hex');
  if (raw.NODE_ENV !== 'test') {
    console.warn('[config] JWT_SECRET not set (or too short) — using an ephemeral development secret.');
  }
}

const apiKey = raw.OPENAI_API_KEY?.trim() || null;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  dataStore: raw.DATA_STORE,
  mongoUri: raw.MONGODB_URI?.trim() || null,
  mongoConnectTimeoutMs: raw.MONGO_CONNECT_TIMEOUT_MS,
  fileDbPath: raw.FILE_DB_PATH,
  jwtSecret,
  sessionTtlHours: raw.SESSION_TTL_HOURS,
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieSameSite: raw.COOKIE_SAMESITE,
  cookieSecure: raw.COOKIE_SECURE || raw.COOKIE_SAMESITE === 'none',
  trustProxy: raw.TRUST_PROXY,
  openai: { apiKey, model: raw.OPENAI_MODEL, timeoutMs: raw.OPENAI_TIMEOUT_MS },
  emailProvider: raw.EMAIL_PROVIDER,
  matching: { assignmentRules: raw.MATCHING_ASSIGNMENT_RULES, minScore: raw.MATCHING_MIN_SCORE },
  // Never expose demo credentials in production, whatever the flag says.
  showDemoCredentials: raw.SHOW_DEMO_CREDENTIALS && raw.NODE_ENV !== 'production',
  autoSeed: raw.AUTO_SEED,
} as const;

export type Env = typeof env;
