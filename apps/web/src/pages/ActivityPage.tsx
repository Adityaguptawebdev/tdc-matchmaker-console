import { useState } from 'react';
import { Activity as ActivityIcon } from 'lucide-react';
import type { Activity, CustomerListItem } from '@tdc/shared';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Select } from '../components/ui/Field';
import { Card, PageHeader, Pagination } from '../components/ui/Layout';
import { ActivityFeed } from '../features/activity/ActivityFeed';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

function groupByDay(items: Activity[]) {
  const groups = new Map<string, Activity[]>();
  for (const a of items) {
    const key = dayFmt.format(new Date(a.createdAt));
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.entries()];
}

export function ActivityPage() {
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const customers = useApi(
    () => api.get<CustomerListItem[]>('/customers', { pageSize: 100, sort: 'name', order: 'asc' }),
    'all-customers',
  );
  const query = { customerId: customerId || undefined, page, pageSize: 30 };
  const { data, meta, loading, error, reload } = useApi(
    () => api.get<Activity[]>('/activity', query),
    JSON.stringify(query),
  );

  return (
    <div>
      <PageHeader
        title="Activity"
        description="A timeline of notes, introductions, feedback and status changes for your customers."
        actions={
          <Select
            aria-label="Filter by customer"
            className="w-auto"
            value={customerId}
            onChange={(e) => (setCustomerId(e.target.value), setPage(1))}
          >
            <option value="">All customers</option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </Select>
        }
      />
      <Card>
        {error ? (
          <div className="p-5">
            <ErrorState message={error.message} onRetry={() => void reload()} />
          </div>
        ) : loading && !data ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : data?.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="h-5 w-5" />}
            title="No activity yet"
            description="Actions you take on customers will be recorded here."
          />
        ) : (
          <div className="space-y-6 px-5 pt-5">
            {groupByDay(data ?? []).map(([day, items]) => (
              <section key={day} aria-label={day}>
                <h2 className="label mb-3">{day}</h2>
                <ActivityFeed items={items} showCustomer={!customerId} />
              </section>
            ))}
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPage={setPage} noun="events" />}
      </Card>
    </div>
  );
}
