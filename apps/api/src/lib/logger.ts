/* Minimal structured logger. Silent under NODE_ENV=test to keep test output readable. */
const silent = process.env.NODE_ENV === 'test';
const stamp = () => new Date().toISOString();

export const logger = {
  info: (msg: string, meta?: unknown) => !silent && console.log(`${stamp()} INFO  ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: unknown) => !silent && console.warn(`${stamp()} WARN  ${msg}`, meta ?? ''),
  error: (msg: string, meta?: unknown) => !silent && console.error(`${stamp()} ERROR ${msg}`, meta ?? ''),
};
