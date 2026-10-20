import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import type { CustomerListItem, MatchRecord } from '@tdc/shared';
import { MATCH_STATUSES, MATCH_STATUS_LABELS } from '@tdc/shared';
import { BandBadge } from '../components/StatusBadges';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Select } from '../components/ui/Field';
import { Card, PageHeader, Pagination } from '../components/ui/Layout';
import { MatchFeedbackControl } from '../features/matching/MatchFeedbackControl';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatDateTime, orDash, relativeTime } from '../lib/format';

export function MatchHistoryPage() {
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const customers = useApi(
    () => api.get<CustomerListItem[]>('/customers', { pageSize: 100, sort: 'name', order: 'asc' }),
    'all-customers',
  );
  const query = { status: status || undefined, customerId: customerId || undefined, page, pageSize: 15 };
  const { data, meta, loading, error, reload, setData } = useApi(
    () => api.get<MatchRecord[]>('/matches', query),
    JSON.stringify(query),
  );

  return (
    <div>
      <PageHeader
        title="Match history"
        description="Every introduction sent, its current status and the feedback recorded."
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-stone-100 px-5 py-3.5">
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
          <Select
            aria-label="Filter by status"
            className="w-auto"
            value={status}
            onChange={(e) => (setStatus(e.target.value), setPage(1))}
          >
            <option value="">All statuses</option>
            {MATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MATCH_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <div className="p-5">
            <ErrorState message={error.message} onRetry={() => void reload()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/80 text-xs text-stone-500">
                <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                  <th scope="col" className="!pl-5">
                    Customer → Match
                  </th>
                  <th scope="col">Score</th>
                  <th scope="col">Sent</th>
                  <th scope="col">Matchmaker</th>
                  <th scope="col">Latest note</th>
                  <th scope="col" className="!pr-5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading && !data
                  ? [0, 1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-3">
                          <Skeleton className="h-9" />
                        </td>
                      </tr>
                    ))
                  : data?.map((m) => {
                      // The first history entry is the automatic "Introduction sent"; show only feedback notes.
                      const lastNote = [...m.statusHistory.slice(1)].reverse().find((h) => h.note);
                      return (
                        <tr key={m.id} className="[&>td]:px-4 [&>td]:py-3">
                          <td className="!pl-5">
                            <div className="flex items-center gap-2">
                              {m.customer && (
                                <Link
                                  to={`/customers/${m.customerId}`}
                                  className="flex items-center gap-2 font-medium text-stone-900 hover:text-brand-700"
                                >
                                  <Avatar
                                    id={m.customer.id}
                                    firstName={m.customer.firstName}
                                    lastName={m.customer.lastName}
                                    size="sm"
                                  />
                                  {m.customer.firstName} {m.customer.lastName}
                                </Link>
                              )}
                              <ArrowRight
                                className="h-3.5 w-3.5 shrink-0 text-stone-300"
                                aria-label="introduced to"
                              />
                              {m.candidate && (
                                <span className="flex items-center gap-2">
                                  <Avatar
                                    id={m.candidate.id}
                                    firstName={m.candidate.firstName}
                                    lastName={m.candidate.lastName}
                                    size="sm"
                                  />
                                  <span>
                                    <span className="block text-stone-900">
                                      {m.candidate.firstName} {m.candidate.lastName}
                                    </span>
                                    <span className="block text-xs text-stone-500">
                                      {orDash(m.candidate.age)} · {orDash(m.candidate.city)}
                                    </span>
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">{m.score}</span>
                              <BandBadge band={m.band} />
                            </div>
                          </td>
                          <td className="whitespace-nowrap text-stone-700" title={formatDateTime(m.sentAt)}>
                            {relativeTime(m.sentAt)}
                          </td>
                          <td className="whitespace-nowrap text-stone-700">{orDash(m.matchmakerName)}</td>
                          <td
                            className="max-w-[220px] truncate text-stone-500"
                            title={lastNote?.note ?? undefined}
                          >
                            {lastNote?.note ?? '—'}
                          </td>
                          <td className="!pr-5">
                            <MatchFeedbackControl
                              match={m}
                              onUpdated={(u) => setData((list) => list?.map((x) => (x.id === u.id ? u : x)))}
                            />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            {!loading && data?.length === 0 && (
              <EmptyState
                icon={<HeartHandshake className="h-5 w-5" />}
                title={
                  status || customerId ? 'No introductions match these filters' : 'No introductions sent yet'
                }
                description="Send a match from a customer’s suggestions page and it will appear here."
              />
            )}
          </div>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPage={setPage} noun="introductions" />}
      </Card>
    </div>
  );
}
