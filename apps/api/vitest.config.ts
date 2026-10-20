import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', DATA_STORE: 'memory', OPENAI_API_KEY: '', AUTO_SEED: 'false' },
    testTimeout: 20_000,
  },
});
