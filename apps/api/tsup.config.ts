import { defineConfig } from 'tsup';

// Bundles the API (and the workspace packages it imports) into dist/; npm dependencies stay external.
export default defineConfig({
  entry: { server: 'src/server.ts', seed: 'src/seed/run.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@tdc\//],
});
