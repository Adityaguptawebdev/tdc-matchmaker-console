import type { CustomerDetail, CustomerListItem, CustomerListQuery, CustomerUpdateInput } from '@tdc/shared';
import { JOURNEY_STATUSES, JOURNEY_STATUS_LABELS, computeAge, fullName } from '@tdc/shared';
import { paginate } from '../lib/http';
import { nowIso } from '../lib/ids';
import { toCustomerListItem } from '../lib/mappers';
import type { MatchmakerEntity, ProfileEntity, Store } from '../store/types';
import { customerScope, getAccessibleCustomer, matchmakerMap } from './access';
import { logActivity } from './activity.service';

const ACTIVE_MATCH_STATUSES = new Set(['pending', 'interested', 'meeting_scheduled']);

export async function listCustomerItems(store: Store, user: MatchmakerEntity): Promise<CustomerListItem[]> {
  const [customers, owners] = await Promise.all([
    store.profiles.find(customerScope(user)),
    matchmakerMap(store),
  ]);
  const ids = customers.map((c) => c.id);
  const matches = ids.length ? await store.matches.find({ customerId: { $in: ids } }) : [];
  const sent = new Map<string, number>();
  for (const m of matches) sent.set(m.customerId, (sent.get(m.customerId) ?? 0) + 1);
  const now = new Date();
  return customers.map((c) => toCustomerListItem(c, owners, sent.get(c.id) ?? 0, now));
}

/**
 * Filtering/sorting runs in the service layer: a matchmaker's book is tens of customers, so this is
 * simpler and adapter-agnostic. At larger scale, push these predicates down into indexed queries.
 */
export async function listCustomers(store: Store, user: MatchmakerEntity, q: CustomerListQuery) {
  let items = await listCustomerItems(store, user);
  if (q.search) {
    const term = q.search.toLowerCase();
    items = items.filter((c) =>
      [`${c.firstName} ${c.lastName}`, c.city ?? '', c.profession ?? ''].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
  }
  if (q.journeyStatus) items = items.filter((c) => c.journeyStatus === q.journeyStatus);
  if (q.gender) items = items.filter((c) => c.gender === q.gender);
  if (q.verification) items = items.filter((c) => c.verificationStatus === q.verification);
  if (q.maritalStatus) items = items.filter((c) => c.maritalStatus === q.maritalStatus);

  const dir = q.order === 'asc' ? 1 : -1;
  const byName = (a: CustomerListItem, b: CustomerListItem) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  items.sort((a, b) => {
    let c = 0;
    if (q.sort === 'name') c = byName(a, b);
    else if (q.sort === 'age') c = (a.age ?? -1) - (b.age ?? -1);
    else if (q.sort === 'journeyStatus')
      c = JOURNEY_STATUSES.indexOf(a.journeyStatus) - JOURNEY_STATUSES.indexOf(b.journeyStatus);
    else {
      // Never-contacted customers sort as the oldest contact.
      c = (a.lastContactedAt ?? '').localeCompare(b.lastContactedAt ?? '');
    }
    return c * dir || byName(a, b);
  });

  return paginate(items, q.page, q.pageSize);
}

export async function getCustomerDetail(
  store: Store,
  user: MatchmakerEntity,
  id: string,
): Promise<CustomerDetail> {
  const customer = await getAccessibleCustomer(store, user, id);
  const [owner, matches, decisions] = await Promise.all([
    store.matchmakers.findById(customer.matchmaking!.ownerId),
    store.matches.find({ customerId: id }),
    store.decisions.find({ customerId: id }),
  ]);
  return {
    ...customer,
    age: computeAge(customer.dateOfBirth),
    owner: owner ? { id: owner.id, name: owner.name, title: owner.title } : null,
    stats: {
      matchesSent: matches.length,
      activeMatches: matches.filter((m) => ACTIVE_MATCH_STATUSES.has(m.status)).length,
      meetingsScheduled: matches.filter((m) => m.status === 'meeting_scheduled').length,
      shortlisted: decisions.filter((d) => d.decision === 'shortlisted').length,
      dismissed: decisions.filter((d) => d.decision === 'dismissed').length,
    },
  };
}

export async function updateCustomer(
  store: Store,
  user: MatchmakerEntity,
  id: string,
  patch: CustomerUpdateInput,
): Promise<CustomerDetail> {
  const customer = await getAccessibleCustomer(store, user, id);
  const mm = customer.matchmaking!;
  const next = { ...mm };
  if (patch.journeyStatus && patch.journeyStatus !== mm.journeyStatus) {
    next.journeyStatus = patch.journeyStatus;
    await logActivity(store, {
      type: 'journey_status_changed',
      actorId: user.id,
      customerId: id,
      message: `Journey status changed from ${JOURNEY_STATUS_LABELS[mm.journeyStatus]} to ${JOURNEY_STATUS_LABELS[patch.journeyStatus]}`,
      meta: { from: mm.journeyStatus, to: patch.journeyStatus },
    });
  }
  if (patch.lastContactedAt) {
    next.lastContactedAt = new Date(patch.lastContactedAt).toISOString();
    await logActivity(store, {
      type: 'contact_logged',
      actorId: user.id,
      customerId: id,
      message: `Logged contact with ${fullName(customer)}`,
    });
  }
  await store.profiles.update(id, { matchmaking: next, updatedAt: nowIso() } as Partial<ProfileEntity>);
  return getCustomerDetail(store, user, id);
}

/** Applies automatic journey transitions triggered by match events (documented in the README). */
export async function advanceJourney(
  store: Store,
  customer: ProfileEntity,
  actorId: string,
  to: 'matches_sent' | 'meeting_scheduled',
  touchContact: boolean,
): Promise<void> {
  const mm = customer.matchmaking;
  if (!mm) return;
  const allowedFrom: Record<typeof to, string[]> = {
    matches_sent: ['new', 'onboarding', 'awaiting_matches'],
    meeting_scheduled: ['new', 'onboarding', 'awaiting_matches', 'matches_sent', 'in_discussion'],
  };
  const next = { ...mm };
  if (touchContact) next.lastContactedAt = nowIso();
  if (allowedFrom[to].includes(mm.journeyStatus)) {
    next.journeyStatus = to;
    await logActivity(store, {
      type: 'journey_status_changed',
      actorId,
      customerId: customer.id,
      message: `Journey status changed from ${JOURNEY_STATUS_LABELS[mm.journeyStatus]} to ${JOURNEY_STATUS_LABELS[to]} (automatic)`,
      meta: { from: mm.journeyStatus, to, automatic: true },
    });
  }
  await store.profiles.update(customer.id, {
    matchmaking: next,
    updatedAt: nowIso(),
  } as Partial<ProfileEntity>);
}
