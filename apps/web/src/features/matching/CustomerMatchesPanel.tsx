import { HeartHandshake, Sparkles } from 'lucide-react';
import type { MatchRecord, RecommendationsResponse } from '@tdc/shared';
import { MATCH_STATUS_LABELS } from '@tdc/shared';
import { BandBadge } from '../../components/StatusBadges';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Card, CardHeader } from '../../components/ui/Layout';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { formatDate, formatDateTime, orDash } from '../../lib/format';
import { MatchFeedbackControl } from './MatchFeedbackControl';

/** Sent introductions with feedback controls, plus shortlisted/dismissed suggestions, for one customer. */
export function CustomerMatchesPanel({
  customerId,
  customerName,
  onChanged,
}: {
  customerId: string;
  customerName: string;
  onChanged: () => void;
}) {
  const matches = useApi(
    () => api.get<MatchRecord[]>('/matches', { customerId, pageSize: 100 }),
    `matches:${customerId}`,
  );
  const recs = useApi(
    () => api.get<RecommendationsResponse>(`/customers/${customerId}/recommendations`, { limit: 1 }),
    `recs:${customerId}`,
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Sent introductions & feedback"
          description="Update the status as you hear back from both sides."
          action={
            <ButtonLink
              to={`/customers/${customerId}/matches`}
              size="sm"
              variant="subtle"
              icon={<Sparkles className="h-3.5 w-3.5" />}
            >
              Find new matches
            </ButtonLink>
          }
        />
        {matches.error ? (
          <div className="p-5">
            <ErrorState message={matches.error.message} onRetry={() => void matches.reload()} />
          </div>
        ) : matches.loading && !matches.data ? (
          <div className="p-5">
            <Skeleton className="h-16" />
          </div>
        ) : matches.data?.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake className="h-5 w-5" />}
            title="No introductions yet"
            description={`Introductions you send to ${customerName} will be tracked here.`}
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {matches.data?.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  {m.candidate && (
                    <Avatar
                      id={m.candidate.id}
                      firstName={m.candidate.firstName}
                      lastName={m.candidate.lastName}
                      size="sm"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900">
                      {m.candidate ? `${m.candidate.firstName} ${m.candidate.lastName}` : m.candidateId}
                    </p>
                    <p className="text-xs text-stone-500">
                      {orDash(m.candidate?.age)} · {orDash(m.candidate?.city)} ·{' '}
                      {orDash(m.candidate?.profession)} · sent {formatDate(m.sentAt)} by {m.matchmakerName}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums text-stone-700"
                    title="Score at the time of sending"
                  >
                    {m.score}
                  </span>
                  <BandBadge band={m.band} />
                  <MatchFeedbackControl
                    match={m}
                    onUpdated={(updated) => {
                      matches.setData((list) => list?.map((x) => (x.id === updated.id ? updated : x)));
                      onChanged();
                    }}
                  />
                </div>
                <details className="mt-2 pl-11 text-sm">
                  <summary className="cursor-pointer text-xs text-stone-500 hover:text-stone-800">
                    Introduction (
                    {m.introductionSource === 'ai'
                      ? 'AI draft'
                      : m.introductionSource === 'edited'
                        ? 'edited by matchmaker'
                        : 'standard template'}
                    ) & status history
                  </summary>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 px-3 py-2 text-[13px] leading-relaxed text-stone-700">
                    {m.introduction}
                  </p>
                  <ol className="mt-2 space-y-1 text-xs text-stone-600">
                    {m.statusHistory.map((h, i) => (
                      <li key={i}>
                        <span className="font-medium text-stone-800">{MATCH_STATUS_LABELS[h.status]}</span> ·{' '}
                        {formatDateTime(h.at)} · {h.byName}
                        {h.note && <span className="text-stone-500"> — “{h.note}”</span>}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {recs.data && (recs.data.shortlisted.length > 0 || recs.data.dismissed.length > 0) && (
        <Card>
          <CardHeader
            title="Previous suggestions"
            description="Shortlisted and dismissed candidates (not yet introduced)."
          />
          <ul className="divide-y divide-stone-100">
            {recs.data.shortlisted.map((r) => (
              <li key={r.candidate.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar
                  id={r.candidate.id}
                  firstName={r.candidate.firstName}
                  lastName={r.candidate.lastName}
                  size="sm"
                />
                <p className="flex-1 text-sm text-stone-900">
                  {r.candidate.firstName} {r.candidate.lastName}{' '}
                  <span className="text-stone-500">· {orDash(r.candidate.city)}</span>
                </p>
                <span className="text-sm font-semibold tabular-nums text-stone-700">{r.breakdown.score}</span>
                <Badge tone="amber">Shortlisted</Badge>
              </li>
            ))}
            {recs.data.dismissed.map((d) => (
              <li key={d.candidate.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar
                  id={d.candidate.id}
                  firstName={d.candidate.firstName}
                  lastName={d.candidate.lastName}
                  size="sm"
                />
                <p className="flex-1 text-sm text-stone-900">
                  {d.candidate.firstName} {d.candidate.lastName}
                  {d.reason && <span className="text-stone-500"> · “{d.reason}”</span>}
                </p>
                <Badge>Dismissed</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
