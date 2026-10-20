import type { Activity, ActivityType } from '@tdc/shared';
import { fullName } from '@tdc/shared';
import { newId, nowIso } from '../lib/ids';
import { paginate } from '../lib/http';
import type { ActivityEntity, MatchmakerEntity, Store } from '../store/types';
import { customerScope, matchmakerMap } from './access';

export async function logActivity(
  store: Store,
  input: {
    type: ActivityType;
    actorId: string;
    customerId: string | null;
    message: string;
    meta?: Record<string, unknown>;
  },
): Promise<ActivityEntity> {
  return store.activities.insert({
    id: newId('act'),
    type: input.type,
    actorId: input.actorId,
    customerId: input.customerId,
    message: input.message,
    meta: input.meta ?? {},
    createdAt: nowIso(),
  });
}

export async function hydrateActivities(store: Store, items: ActivityEntity[]): Promise<Activity[]> {
  const owners = await matchmakerMap(store);
  const customerIds = [...new Set(items.map((a) => a.customerId).filter((x): x is string => !!x))];
  const customers = customerIds.length ? await store.profiles.find({ id: { $in: customerIds } }) : [];
  const names = new Map(customers.map((c) => [c.id, fullName(c)]));
  return items.map((a) => ({
    ...a,
    customerName: a.customerId ? (names.get(a.customerId) ?? null) : null,
    actorName: owners.get(a.actorId)?.name ?? null,
  }));
}

/** Activity visible to the user: events on their customers (all events for leads). */
export async function listActivities(
  store: Store,
  user: MatchmakerEntity,
  query: { customerId?: string; page: number; pageSize: number },
) {
  let customerIds: string[];
  if (query.customerId) {
    customerIds = [query.customerId];
  } else {
    customerIds = (await store.profiles.find(customerScope(user))).map((c) => c.id);
  }
  const all = await store.activities.find({ customerId: { $in: customerIds } }, { sort: { createdAt: -1 } });
  const { items, meta } = paginate(all, query.page, query.pageSize);
  return { items: await hydrateActivities(store, items), meta };
}
