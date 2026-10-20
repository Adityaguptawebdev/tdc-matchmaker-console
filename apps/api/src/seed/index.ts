import { hashPassword } from '../services/auth.service';
import type { Store } from '../store/types';
import { buildClients } from './customers';
import { buildHistory } from './history';
import { DEMO_PASSWORD, DEMO_USERS } from './matchmakers';
import { generateMembers } from './members';

export interface SeedSummary {
  reset: boolean;
  inserted: Record<string, number>;
  totals: Record<string, number>;
}

/**
 * Idempotent seed: every record has a deterministic id and is inserted only if missing, so running it
 * twice never duplicates data and never overwrites changes made through the app.
 * `reset: true` wipes all collections first for a clean demo.
 */
export async function seedDatabase(
  store: Store,
  options: { reset?: boolean; now?: Date } = {},
): Promise<SeedSummary> {
  const now = options.now ?? new Date();
  if (options.reset) {
    await Promise.all(
      [
        store.matchmakers,
        store.profiles,
        store.notes,
        store.matches,
        store.decisions,
        store.activities,
        store.outbox,
      ].map((c) => c.deleteAll()),
    );
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const matchmakers = DEMO_USERS.map((u) => ({ ...u, passwordHash, createdAt: '2026-01-01T09:00:00.000Z' }));
  const members = generateMembers(130);
  const clients = buildClients(now);
  const history = buildHistory(clients, [...members, ...clients], now);

  // Never seed an introduction for a pair that was already introduced through the app.
  const appPairs = new Set(
    (await store.matches.find()).filter((m) => !m.id.startsWith('match_seed_')).map((m) => m.pairKey),
  );
  const seedMatches = history.matches.filter((m) => !appPairs.has(m.pairKey));
  const keptMatchIds = new Set(seedMatches.map((m) => m.id));

  const inserted = {
    matchmakers: await store.matchmakers.insertMissing(matchmakers),
    profiles: await store.profiles.insertMissing([...clients, ...members]),
    notes: await store.notes.insertMissing(history.notes),
    matches: await store.matches.insertMissing(seedMatches),
    decisions: await store.decisions.insertMissing(history.decisions),
    activities: await store.activities.insertMissing(
      history.activities.filter(
        (a) => typeof a.meta.matchId !== 'string' || keptMatchIds.has(a.meta.matchId),
      ),
    ),
    outbox: await store.outbox.insertMissing(history.outbox.filter((e) => keptMatchIds.has(e.matchId))),
  };

  const totals = {
    matchmakers: await store.matchmakers.count(),
    profiles: await store.profiles.count(),
    clients: await store.profiles.count({ kind: 'client' }),
    members: await store.profiles.count({ kind: 'member' }),
    notes: await store.notes.count(),
    matches: await store.matches.count(),
    decisions: await store.decisions.count(),
    activities: await store.activities.count(),
    outbox: await store.outbox.count(),
  };
  return { reset: !!options.reset, inserted, totals };
}
