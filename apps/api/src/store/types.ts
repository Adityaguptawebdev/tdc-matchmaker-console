import type {
  ActivityType,
  MatchStatus,
  MatchStatusChange,
  MatchmakerRole,
  NoteType,
  Profile,
  ScoreBand,
  SuggestionDecision,
} from '@tdc/shared';

/**
 * Persistence-agnostic entity shapes. All timestamps are ISO-8601 UTC strings in every adapter,
 * so lexical order equals chronological order.
 */
export interface MatchmakerEntity {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role: MatchmakerRole;
  title: string;
  createdAt: string;
}

export type ProfileEntity = Profile;

export interface NoteEntity {
  id: string;
  customerId: string;
  authorId: string;
  type: NoteType;
  body: string;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchEntity {
  id: string;
  /** Order-independent pair key ("a__b" with sorted ids) — unique, prevents duplicate introductions. */
  pairKey: string;
  customerId: string;
  candidateId: string;
  matchmakerId: string;
  status: MatchStatus;
  score: number;
  band: ScoreBand;
  introduction: string;
  introductionSource: 'ai' | 'fallback' | 'edited';
  emailIds: string[];
  sentAt: string;
  updatedAt: string;
  statusHistory: Omit<MatchStatusChange, 'byName'>[];
}

export interface DecisionEntity {
  /** `${customerId}__${candidateId}` — one decision per pair. */
  id: string;
  customerId: string;
  candidateId: string;
  decision: SuggestionDecision;
  reason: string | null;
  decidedById: string;
  decidedAt: string;
}

export interface ActivityEntity {
  id: string;
  type: ActivityType;
  customerId: string | null;
  actorId: string;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface OutboxEntity {
  id: string;
  matchId: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  provider: 'mock';
  createdAt: string;
}

type Primitive = string | number | boolean | null;
/** Minimal query language every adapter supports: equality on (dot-)paths and `$in`. */
export type Filter = Record<string, Primitive | { $in: Primitive[] }>;

export interface FindOptions {
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
}

export interface Collection<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  find(filter?: Filter, options?: FindOptions): Promise<T[]>;
  count(filter?: Filter): Promise<number>;
  /** Throws DuplicateKeyError when a unique constraint is violated. */
  insert(doc: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  /** Insert-or-replace by id. */
  upsert(doc: T): Promise<T>;
  delete(id: string): Promise<boolean>;
  /** Inserts docs whose ids do not exist yet; returns the number inserted. Used by the idempotent seed. */
  insertMissing(docs: T[]): Promise<number>;
  deleteAll(): Promise<void>;
}

export interface Store {
  kind: 'mongo' | 'file' | 'memory';
  /** True when writes survive a process restart. */
  persistent: boolean;
  fallbackReason: string | null;
  matchmakers: Collection<MatchmakerEntity>;
  profiles: Collection<ProfileEntity>;
  notes: Collection<NoteEntity>;
  matches: Collection<MatchEntity>;
  decisions: Collection<DecisionEntity>;
  activities: Collection<ActivityEntity>;
  outbox: Collection<OutboxEntity>;
  close(): Promise<void>;
}

export class DuplicateKeyError extends Error {
  constructor(public readonly field: string) {
    super(`Duplicate value for unique field "${field}"`);
    this.name = 'DuplicateKeyError';
  }
}

/** Unique constraints shared by all adapters (Mongo enforces them with unique indexes). */
export const UNIQUE_FIELDS: Partial<
  Record<keyof Omit<Store, 'kind' | 'persistent' | 'fallbackReason' | 'close'>, string[]>
> = {
  matchmakers: ['username', 'email'],
  matches: ['pairKey'],
};
