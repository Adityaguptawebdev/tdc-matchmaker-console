import type { DashboardData } from '@tdc/shared';
import { JOURNEY_STATUSES, MATCH_STATUSES } from '@tdc/shared';
import type { MatchmakerEntity, Store } from '../store/types';
import { listActivities } from './activity.service';
import { listCustomerItems } from './customer.service';

const STALE_AFTER_DAYS = 14;

export async function getDashboard(store: Store, user: MatchmakerEntity): Promise<DashboardData> {
  const customers = await listCustomerItems(store, user);
  const ids = customers.map((c) => c.id);
  const [matches, pool, activity] = await Promise.all([
    ids.length ? store.matches.find({ customerId: { $in: ids } }) : Promise.resolve([]),
    store.profiles.count({ kind: 'member', status: 'active' }),
    listActivities(store, user, { page: 1, pageSize: 8 }),
  ]);

  const staleBefore = new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000).toISOString();
  const needsAttention = customers
    .filter((c) => !['matched', 'on_hold'].includes(c.journeyStatus))
    .filter((c) => !c.lastContactedAt || c.lastContactedAt < staleBefore)
    .sort((a, b) => (a.lastContactedAt ?? '').localeCompare(b.lastContactedAt ?? ''))
    .slice(0, 5);

  return {
    totals: {
      assignedCustomers: customers.length,
      verifiedCustomers: customers.filter((c) => c.verificationStatus === 'verified').length,
      awaitingMatches: customers.filter((c) => c.journeyStatus === 'awaiting_matches').length,
      matchesSent: matches.length,
      meetingsScheduled: matches.filter((m) => m.status === 'meeting_scheduled').length,
      activeConversations: matches.filter((m) => m.status === 'interested').length,
      candidatePool: pool,
    },
    journeyDistribution: JOURNEY_STATUSES.map((status) => ({
      status,
      count: customers.filter((c) => c.journeyStatus === status).length,
    })),
    matchStatusDistribution: MATCH_STATUSES.map((status) => ({
      status,
      count: matches.filter((m) => m.status === status).length,
    })),
    needsAttention,
    recentActivity: activity.items,
  };
}
