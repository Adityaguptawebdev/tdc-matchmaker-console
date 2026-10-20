import { env } from '../config/env';
import { logger } from '../lib/logger';
import { createFileStore } from './fileStore';
import { createMemoryStore } from './memoryStore';
import { createMongoStore } from './mongoStore';
import type { Store } from './types';

export type { Store } from './types';

/**
 * Selects the data store:
 *   - mongo:  MongoDB via Mongoose (fails fast if unreachable).
 *   - file:   JSON file on disk — persistent, single-process, for local demos.
 *   - memory: in-process only — NOT persistent; used by automated tests.
 *   - auto:   try MongoDB; if not configured/reachable, fall back to the file store and say so loudly.
 */
export async function connectStore(): Promise<Store> {
  const mode = env.dataStore;
  if (mode === 'memory') return createMemoryStore();
  if (mode === 'file') return createFileStore(env.fileDbPath);

  if (mode === 'mongo') {
    if (!env.mongoUri) throw new Error('DATA_STORE=mongo requires MONGODB_URI');
    return createMongoStore(env.mongoUri, env.mongoConnectTimeoutMs);
  }

  if (env.mongoUri) {
    try {
      return await createMongoStore(env.mongoUri, env.mongoConnectTimeoutMs);
    } catch (err) {
      const reason = `MongoDB unreachable (${(err as Error).message.split('\n')[0]}); using local JSON file store.`;
      logger.warn(`[store] ${reason}`);
      return createFileStore(env.fileDbPath, reason);
    }
  }
  const reason = 'MONGODB_URI not set; using local JSON file store.';
  logger.warn(`[store] ${reason}`);
  return createFileStore(env.fileDbPath, reason);
}
