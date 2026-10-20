import fs from 'node:fs/promises';
import path from 'node:path';
import { COLLECTION_NAMES, createCollections } from './memoryStore';
import type { Store } from './types';

/**
 * Local-development persistence: the whole dataset lives in one JSON file that is rewritten atomically
 * (write temp file → rename) after every mutation. Writes are serialised and awaited before the API
 * responds, so a successful response means the change is on disk.
 *
 * Suitable for demos and single-process development — not for multi-instance production use.
 */
export async function createFileStore(
  filePath: string,
  fallbackReason: string | null = null,
): Promise<Store> {
  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });

  let writeChain: Promise<void> = Promise.resolve();
  // eslint-disable-next-line prefer-const -- assigned after the collections that reference it are created
  let collections: ReturnType<typeof createCollections>;

  const persist = (): Promise<void> => {
    writeChain = writeChain.then(async () => {
      const data = Object.fromEntries(COLLECTION_NAMES.map((name) => [name, collections[name].dump()]));
      const tmp = `${absolute}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(tmp, absolute);
    });
    return writeChain;
  };

  collections = createCollections(persist);

  try {
    const content = await fs.readFile(absolute, 'utf8');
    const data = JSON.parse(content) as Record<string, unknown[]>;
    for (const name of COLLECTION_NAMES) {
      const docs = Array.isArray(data[name]) ? data[name] : [];
      (collections[name] as { load(d: unknown[]): void }).load(docs);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Could not read file store at ${absolute}: ${(err as Error).message}`);
    }
  }

  return {
    kind: 'file',
    persistent: true,
    fallbackReason,
    ...collections,
    close: async () => {
      await writeChain;
    },
  };
}
