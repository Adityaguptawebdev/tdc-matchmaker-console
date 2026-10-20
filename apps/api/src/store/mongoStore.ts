import mongoose, { type Model } from 'mongoose';
import {
  ActivityModel,
  DecisionModel,
  MatchModel,
  MatchmakerModel,
  NoteModel,
  OutboxModel,
} from '../models/operational.model';
import { ProfileModel } from '../models/profile.model';
import type { Collection, Filter, FindOptions, Store } from './types';
import { DuplicateKeyError } from './types';

const isPrimitive = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

/**
 * Translates the adapter-neutral filter into a Mongo query. Only equality and `$in` with primitive
 * values are accepted, so request data can never smuggle query operators into MongoDB.
 */
function toMongoFilter(filter: Filter = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, cond] of Object.entries(filter)) {
    const field = key === 'id' ? '_id' : key;
    if (cond !== null && typeof cond === 'object') {
      if (!Array.isArray(cond.$in) || !cond.$in.every(isPrimitive))
        throw new Error(`Invalid filter for ${key}`);
      out[field] = { $in: cond.$in };
    } else {
      if (!isPrimitive(cond)) throw new Error(`Invalid filter for ${key}`);
      out[field] = { $eq: cond };
    }
  }
  return out;
}

const toEntity = <T>(doc: Record<string, unknown> | null): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as T;
};

const toDoc = <T extends { id: string }>(entity: Partial<T>): Record<string, unknown> => {
  const { id, ...rest } = entity as Record<string, unknown>;
  return id === undefined ? rest : { _id: id, ...rest };
};

function rethrowDuplicate(err: unknown): never {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (e?.code === 11000) throw new DuplicateKeyError(Object.keys(e.keyPattern ?? { id: 1 })[0] ?? 'id');
  throw err;
}

class MongoCollection<T extends { id: string }> implements Collection<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- models are schema-typed at the boundary via T
  constructor(private readonly model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    return toEntity<T>(await this.model.findOne({ _id: { $eq: id } }).lean<Record<string, unknown>>());
  }

  async find(filter?: Filter, options: FindOptions = {}): Promise<T[]> {
    let q = this.model.find(toMongoFilter(filter));
    if (options.sort)
      q = q.sort({
        ...Object.fromEntries(Object.entries(options.sort).map(([k, v]) => [k === 'id' ? '_id' : k, v])),
        _id: 1,
      });
    if (options.skip) q = q.skip(options.skip);
    if (options.limit !== undefined) q = q.limit(options.limit);
    const docs = await q.lean<Record<string, unknown>[]>();
    return docs.map((d) => toEntity<T>(d) as T);
  }

  async count(filter?: Filter): Promise<number> {
    return this.model.countDocuments(toMongoFilter(filter));
  }

  async insert(doc: T): Promise<T> {
    try {
      await this.model.create(toDoc(doc));
      return doc;
    } catch (err) {
      rethrowDuplicate(err);
    }
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const { id: _ignored, ...rest } = patch as Record<string, unknown>;
    try {
      const doc = await this.model
        .findOneAndUpdate({ _id: { $eq: id } }, { $set: rest }, { new: true, runValidators: true })
        .lean<Record<string, unknown>>();
      return toEntity<T>(doc);
    } catch (err) {
      rethrowDuplicate(err);
    }
  }

  async upsert(doc: T): Promise<T> {
    try {
      await this.model.replaceOne({ _id: { $eq: doc.id } }, toDoc(doc), {
        upsert: true,
        runValidators: true,
      });
      return doc;
    } catch (err) {
      rethrowDuplicate(err);
    }
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.model.deleteOne({ _id: { $eq: id } });
    return res.deletedCount > 0;
  }

  async insertMissing(docs: T[]): Promise<number> {
    if (docs.length === 0) return 0;
    const res = await this.model.bulkWrite(
      docs.map((d) => ({
        updateOne: { filter: { _id: d.id }, update: { $setOnInsert: toDoc(d) }, upsert: true },
      })),
      { ordered: false },
    );
    return res.upsertedCount;
  }

  async deleteAll(): Promise<void> {
    await this.model.deleteMany({});
  }
}

export async function createMongoStore(uri: string, timeoutMs: number): Promise<Store> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: timeoutMs });
  await Promise.all(
    [ProfileModel, MatchmakerModel, NoteModel, MatchModel, DecisionModel, ActivityModel, OutboxModel].map(
      (m) => m.syncIndexes(),
    ),
  );
  return {
    kind: 'mongo',
    persistent: true,
    fallbackReason: null,
    matchmakers: new MongoCollection(MatchmakerModel),
    profiles: new MongoCollection(ProfileModel),
    notes: new MongoCollection(NoteModel),
    matches: new MongoCollection(MatchModel),
    decisions: new MongoCollection(DecisionModel),
    activities: new MongoCollection(ActivityModel),
    outbox: new MongoCollection(OutboxModel),
    close: async () => {
      await mongoose.disconnect();
    },
  };
}
