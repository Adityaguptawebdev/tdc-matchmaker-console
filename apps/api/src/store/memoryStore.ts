import type {
  ActivityEntity,
  Collection,
  DecisionEntity,
  Filter,
  FindOptions,
  MatchEntity,
  MatchmakerEntity,
  NoteEntity,
  OutboxEntity,
  ProfileEntity,
  Store,
} from './types';
import { DuplicateKeyError, UNIQUE_FIELDS } from './types';

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function matchesFilter(doc: unknown, filter: Filter = {}): boolean {
  return Object.entries(filter).every(([path, cond]) => {
    const value = getPath(doc, path) ?? null;
    if (cond !== null && typeof cond === 'object' && '$in' in cond) return cond.$in.includes(value as never);
    return value === cond;
  });
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  return a < b ? -1 : 1;
}

export function applyFindOptions<T extends { id: string }>(docs: T[], options: FindOptions = {}): T[] {
  let out = docs;
  if (options.sort) {
    const entries = Object.entries(options.sort);
    out = [...out].sort((x, y) => {
      for (const [path, dir] of entries) {
        const c = compare(getPath(x, path), getPath(y, path));
        if (c !== 0) return c * dir;
      }
      return compare(x.id, y.id);
    });
  }
  const skip = options.skip ?? 0;
  return out.slice(skip, options.limit !== undefined ? skip + options.limit : undefined);
}

/**
 * In-process collection. Used directly for tests (non-persistent) and as the engine of the file store.
 * Documents are cloned on the way in and out so callers can never mutate stored state by reference.
 */
export class MemoryCollection<T extends { id: string }> implements Collection<T> {
  protected items = new Map<string, T>();

  constructor(
    private readonly uniqueFields: string[] = [],
    private readonly onChange: () => Promise<void> = async () => {},
  ) {}

  load(docs: T[]): void {
    this.items = new Map(docs.map((d) => [d.id, structuredClone(d)]));
  }

  dump(): T[] {
    return [...this.items.values()];
  }

  private assertUnique(doc: T): void {
    for (const field of this.uniqueFields) {
      const value = getPath(doc, field);
      for (const existing of this.items.values()) {
        if (existing.id !== doc.id && getPath(existing, field) === value) throw new DuplicateKeyError(field);
      }
    }
  }

  async findById(id: string): Promise<T | null> {
    const doc = this.items.get(id);
    return doc ? structuredClone(doc) : null;
  }

  async find(filter?: Filter, options?: FindOptions): Promise<T[]> {
    const docs = [...this.items.values()].filter((d) => matchesFilter(d, filter));
    return applyFindOptions(docs, options).map((d) => structuredClone(d));
  }

  async count(filter?: Filter): Promise<number> {
    let n = 0;
    for (const d of this.items.values()) if (matchesFilter(d, filter)) n++;
    return n;
  }

  async insert(doc: T): Promise<T> {
    if (this.items.has(doc.id)) throw new DuplicateKeyError('id');
    this.assertUnique(doc);
    this.items.set(doc.id, structuredClone(doc));
    await this.onChange();
    return structuredClone(doc);
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const next = { ...existing, ...structuredClone(patch), id } as T;
    this.assertUnique(next);
    this.items.set(id, next);
    await this.onChange();
    return structuredClone(next);
  }

  async upsert(doc: T): Promise<T> {
    this.assertUnique(doc);
    this.items.set(doc.id, structuredClone(doc));
    await this.onChange();
    return structuredClone(doc);
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.items.delete(id);
    if (existed) await this.onChange();
    return existed;
  }

  async insertMissing(docs: T[]): Promise<number> {
    let inserted = 0;
    for (const doc of docs) {
      if (this.items.has(doc.id)) continue;
      this.assertUnique(doc);
      this.items.set(doc.id, structuredClone(doc));
      inserted++;
    }
    if (inserted > 0) await this.onChange();
    return inserted;
  }

  async deleteAll(): Promise<void> {
    this.items.clear();
    await this.onChange();
  }
}

export type CollectionName =
  | 'matchmakers'
  | 'profiles'
  | 'notes'
  | 'matches'
  | 'decisions'
  | 'activities'
  | 'outbox';
export const COLLECTION_NAMES: CollectionName[] = [
  'matchmakers',
  'profiles',
  'notes',
  'matches',
  'decisions',
  'activities',
  'outbox',
];

export function createCollections(onChange?: () => Promise<void>) {
  const make = <T extends { id: string }>(name: CollectionName) =>
    new MemoryCollection<T>((UNIQUE_FIELDS as Record<string, string[] | undefined>)[name] ?? [], onChange);
  return {
    matchmakers: make<MatchmakerEntity>('matchmakers'),
    profiles: make<ProfileEntity>('profiles'),
    notes: make<NoteEntity>('notes'),
    matches: make<MatchEntity>('matches'),
    decisions: make<DecisionEntity>('decisions'),
    activities: make<ActivityEntity>('activities'),
    outbox: make<OutboxEntity>('outbox'),
  };
}

/** Non-persistent store. Only used for automated tests; always reported as `persistent: false`. */
export function createMemoryStore(fallbackReason: string | null = null): Store {
  return { kind: 'memory', persistent: false, fallbackReason, ...createCollections(), close: async () => {} };
}
