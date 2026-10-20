import crypto from 'node:crypto';

/** Prefixed, URL-safe random ids, e.g. `note_9f2c1a7b3d4e`. */
export const newId = (prefix: string): string => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

export const nowIso = (): string => new Date().toISOString();

/** Order-independent key for a pair of profiles. */
export const pairKey = (a: string, b: string): string => (a < b ? `${a}__${b}` : `${b}__${a}`);
