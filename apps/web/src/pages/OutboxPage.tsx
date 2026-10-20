import { useState } from 'react';
import { Inbox, Mail } from 'lucide-react';
import type { OutboxEmail } from '@tdc/shared';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Card, PageHeader, Pagination } from '../components/ui/Layout';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

export function OutboxPage() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApi(
    () => api.get<OutboxEmail[]>('/outbox', { page, pageSize: 15 }),
    `outbox:${page}`,
  );

  return (
    <div>
      <PageHeader title="Email outbox" description="Introductions recorded by the mock email provider." />
      <div
        role="note"
        className="mb-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
      >
        <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">Simulated emails only.</strong> The API is running with{' '}
          <code className="rounded bg-white/70 px-1">EMAIL_PROVIDER=mock</code>: messages are stored here and
          logged to the server console. Nothing was delivered to a real inbox, and all addresses use the
          reserved <code className="rounded bg-white/70 px-1">example.com</code> domain.
        </p>
      </div>
      <Card>
        {error ? (
          <div className="p-5">
            <ErrorState message={error.message} onRetry={() => void reload()} />
          </div>
        ) : loading && !data ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : data?.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="Outbox is empty"
            description="Send a match to see the simulated email here."
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {data?.map((e) => (
              <li key={e.id}>
                <details className="group px-5 py-3.5">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                    <Badge tone="sky">Simulated</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">
                      {e.subject}
                    </span>
                    <span className="text-xs text-stone-500">
                      to {e.toName} &lt;{e.to}&gt;
                    </span>
                    <time className="text-xs text-stone-500" dateTime={e.createdAt}>
                      {formatDateTime(e.createdAt)}
                    </time>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-stone-50 px-4 py-3 font-sans text-[13px] leading-relaxed text-stone-700">
                    {e.body}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
        {meta && meta.total > 0 && <Pagination meta={meta} onPage={setPage} noun="emails" />}
      </Card>
    </div>
  );
}
