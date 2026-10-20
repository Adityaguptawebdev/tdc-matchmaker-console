import type { Filter, MatchmakerEntity, ProfileEntity, Store } from '../store/types';
import { notFound } from '../lib/http';

/** Leads see every customer; matchmakers see only the customers assigned to them. */
export function customerScope(user: MatchmakerEntity): Filter {
  return user.role === 'lead' ? { kind: 'client' } : { kind: 'client', 'matchmaking.ownerId': user.id };
}

/**
 * Loads a customer the user is allowed to manage. Returns 404 (not 403) for customers owned by someone
 * else, so ids of other matchmakers' clients cannot be probed.
 */
export async function getAccessibleCustomer(
  store: Store,
  user: MatchmakerEntity,
  id: string,
): Promise<ProfileEntity> {
  const profile = await store.profiles.findById(id);
  if (!profile || profile.kind !== 'client' || !profile.matchmaking) throw notFound('Customer');
  if (user.role !== 'lead' && profile.matchmaking.ownerId !== user.id) throw notFound('Customer');
  return profile;
}

export async function matchmakerMap(store: Store): Promise<Map<string, MatchmakerEntity>> {
  const all = await store.matchmakers.find();
  return new Map(all.map((m) => [m.id, m]));
}
