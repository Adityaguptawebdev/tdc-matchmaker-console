import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { seedDatabase } from './seed';
import { aiStatus } from './services/ai.service';
import { connectStore } from './store';

async function main() {
  const store = await connectStore();
  logger.info(
    `[store] using ${store.kind} store (${store.persistent ? 'persistent' : 'NOT persistent — data is lost on restart'})`,
  );

  if (env.autoSeed && (await store.matchmakers.count()) === 0) {
    logger.info('[seed] empty database detected — seeding demo data (AUTO_SEED=true)');
    const summary = await seedDatabase(store);
    logger.info('[seed] done', summary);
  }

  const ai = aiStatus();
  logger.info(
    ai.enabled
      ? `[ai] OpenAI enabled (model ${ai.model})`
      : '[ai] OPENAI_API_KEY not set — using deterministic fallbacks',
  );
  logger.info(`[email] provider: ${env.emailProvider} (simulated — no real emails are sent)`);

  const app = createApp(store);
  const server = app.listen(env.port, () => logger.info(`[api] listening on http://localhost:${env.port}`));

  const shutdown = async (signal: string) => {
    logger.info(`[api] ${signal} received, shutting down`);
    server.close();
    await store.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('[api] failed to start', err);
  process.exit(1);
});
