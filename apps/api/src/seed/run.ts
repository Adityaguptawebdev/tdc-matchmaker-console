import { logger } from '../lib/logger';
import { connectStore } from '../store';
import { seedDatabase } from './index';

/** CLI: `npm run seed` (idempotent insert-missing) or `npm run seed:reset` (wipe and reseed). */
async function main() {
  const reset = process.argv.includes('--reset');
  const store = await connectStore();
  if (!store.persistent)
    logger.warn('[seed] the selected store is NOT persistent — seeded data will vanish on exit');
  logger.info(`[seed] seeding ${store.kind} store${reset ? ' (reset)' : ''}…`);
  const summary = await seedDatabase(store, { reset });
  console.table(
    Object.keys(summary.totals).map((k) => ({
      collection: k,
      insertedNow: summary.inserted[k] ?? '—',
      total: summary.totals[k],
    })),
  );
  await store.close();
}

main().catch((err) => {
  logger.error('[seed] failed', err);
  process.exit(1);
});
