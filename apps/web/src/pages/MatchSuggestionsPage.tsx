import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Filter, Info, RotateCcw, SearchX, Star, Undo2, X } from 'lucide-react';
import type {
  CandidateSummary,
  MatchBreakdown,
  MatchRecord,
  Recommendation,
  RecommendationsResponse,
} from '@tdc/shared';
import {
  CATEGORY_LABELS,
  EXCLUSION_REASON_LABELS,
  PROFESSION_CATEGORIES,
  PROFESSION_CATEGORY_LABELS,
  type CategoryKey,
  type ExclusionReason,
} from '@tdc/shared';
import { MatchCelebration } from '../components/motion/MatchCelebration';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, PageSkeleton, Skeleton } from '../components/ui/Feedback';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { PageHeader } from '../components/ui/Layout';
import { useToast } from '../components/ui/Toast';
import { CandidateDrawer } from '../features/matching/CandidateDrawer';
import { SendMatchModal } from '../features/matching/SendMatchModal';
import { SuggestionCard } from '../features/matching/SuggestionCard';
import { useApi, useDebounced } from '../hooks/useApi';
import { api, errorMessage } from '../lib/api';
import { formatDate, orDash } from '../lib/format';

const CITIES = [
  'Ahmedabad',
  'Bengaluru',
  'Chandigarh',
  'Chennai',
  'Delhi',
  'Hyderabad',
  'Jaipur',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Pune',
  'Dubai',
  'London',
  'San Francisco',
  'Singapore',
];

interface Filters {
  city: string;
  minAge: string;
  maxAge: string;
  professionCategory: string;
  verifiedOnly: boolean;
  sort: 'score' | 'confidence' | 'age' | 'name';
}
const DEFAULT_FILTERS: Filters = {
  city: '',
  minAge: '',
  maxAge: '',
  professionCategory: '',
  verifiedOnly: false,
  sort: 'score',
};

export function MatchSuggestionsPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const debounced = useDebounced(filters, 300);
  const [viewing, setViewing] = useState<string | null>(null);
  const [sending, setSending] = useState<{ candidate: CandidateSummary; breakdown: MatchBreakdown } | null>(
    null,
  );
  const [dismissing, setDismissing] = useState<Recommendation | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<MatchRecord | null>(null);
  const endCelebration = useCallback(() => setCelebrating(null), []);

  const ageError =
    debounced.minAge && debounced.maxAge && Number(debounced.minAge) > Number(debounced.maxAge)
      ? 'Min age must be ≤ max age'
      : null;
  const query = useMemo(
    () => ({
      city: debounced.city || undefined,
      minAge: debounced.minAge || undefined,
      maxAge: debounced.maxAge || undefined,
      professionCategory: debounced.professionCategory || undefined,
      verifiedOnly: debounced.verifiedOnly ? 'true' : undefined,
      sort: debounced.sort,
      order: debounced.sort === 'name' || debounced.sort === 'age' ? 'asc' : 'desc',
      limit: 50,
    }),
    [debounced],
  );
  const { data, loading, error, reload } = useApi(
    () =>
      ageError
        ? Promise.reject(new Error(ageError))
        : api.get<RecommendationsResponse>(`/customers/${id}/recommendations`, query),
    `${id}:${JSON.stringify(query)}:${ageError}`,
  );

  const activeFilters = (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter(
    (k) => k !== 'sort' && filters[k] !== DEFAULT_FILTERS[k],
  ).length;
  const customer = data?.customer;

  const decide = async (
    candidateId: string,
    decision: 'shortlisted' | 'dismissed' | 'none',
    why?: string,
  ) => {
    setBusyId(candidateId);
    try {
      await api.put(`/customers/${id}/recommendations/${candidateId}/decision`, {
        decision,
        reason: why || undefined,
      });
      await reload();
      return true;
    } catch (err) {
      toast.error('Could not save feedback', errorMessage(err));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error && !data && !ageError)
    return <ErrorState message={error.message} onRetry={() => void reload()} />;
  if (!data || !customer) return <ErrorState message={ageError ?? 'Not found'} />;

  const excluded = Object.entries(data.summary.excludedByReason).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            to={`/customers/${id}`}
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to profile
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar id={customer.id} firstName={customer.firstName} lastName={customer.lastName} />
            Suggestions for {customer.firstName} {customer.lastName}
          </span>
        }
        description={`${orDash(customer.age)} · ${orDash(customer.city)} · ${orDash(customer.profession)} — showing eligible ${customer.gender === 'male' ? 'women' : 'men'} ranked by mutual compatibility`}
      />

      <section className="card grid gap-4 p-5 lg:grid-cols-[1fr_auto]" aria-label="Ranking summary">
        <div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p>
              <span className="text-xl font-semibold tabular-nums text-stone-900">
                {data.summary.evaluated}
              </span>{' '}
              <span className="text-stone-500">profiles evaluated</span>
            </p>
            <p>
              <span className="text-xl font-semibold tabular-nums text-stone-900">
                {data.summary.eligible}
              </span>{' '}
              <span className="text-stone-500">eligible</span>
            </p>
            <p>
              <span className="text-xl font-semibold tabular-nums text-brand-700">
                {data.summary.recommended}
              </span>{' '}
              <span className="text-stone-500">recommended (score ≥ {data.summary.minScore})</span>
            </p>
            {data.summary.belowThreshold > 0 && (
              <p>
                <span className="text-xl font-semibold tabular-nums text-stone-900">
                  {data.summary.belowThreshold}
                </span>{' '}
                <span className="text-stone-500">below threshold</span>
              </p>
            )}
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-stone-600 hover:text-stone-900">
              Why profiles were excluded ({excluded.reduce((a, [, n]) => a + (n ?? 0), 0)})
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {excluded.map(([code, n]) => (
                <li key={code} className="flex justify-between gap-3 text-stone-600">
                  <span>{EXCLUSION_REASON_LABELS[code as ExclusionReason]}</span>
                  <span className="tabular-nums text-stone-900">{n}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <details className="text-sm lg:w-80">
          <summary className="flex cursor-pointer items-center gap-1.5 text-stone-600 hover:text-stone-900">
            <Info className="h-4 w-4" aria-hidden /> How scores work ·{' '}
            {data.config.weightProfile.replace('_', ' ')} weights
          </summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(data.config.weights).map(([k, w]) => (
              <li key={k} className="flex justify-between text-stone-600">
                <span>{CATEGORY_LABELS[k as CategoryKey]}</span>
                <span className="tabular-nums text-stone-900">{w}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-500">
            Bands: {data.config.bands.map((b) => `${b.label} ≥ ${b.min}`).join(' · ')}. Both people’s
            preferences count; missing data is treated as unknown, not as a mismatch. Scores are not a
            prediction of relationship success.
          </p>
        </details>
      </section>

      <section className="card flex flex-wrap items-end gap-3 p-4" aria-label="Filters">
        <Filter className="mb-2.5 hidden h-4 w-4 text-stone-400 sm:block" aria-hidden />
        <Field label="City" className="w-40">
          {(a) => (
            <Select
              {...a}
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">Any city</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Min age" className="w-24" error={ageError ?? undefined}>
          {(a) => (
            <Input
              {...a}
              type="number"
              min={18}
              max={80}
              inputMode="numeric"
              value={filters.minAge}
              onChange={(e) => setFilters((f) => ({ ...f, minAge: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Max age" className="w-24">
          {(a) => (
            <Input
              {...a}
              type="number"
              min={18}
              max={80}
              inputMode="numeric"
              value={filters.maxAge}
              onChange={(e) => setFilters((f) => ({ ...f, maxAge: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Profession" className="w-52">
          {(a) => (
            <Select
              {...a}
              value={filters.professionCategory}
              onChange={(e) => setFilters((f) => ({ ...f, professionCategory: e.target.value }))}
            >
              <option value="">Any profession</option>
              {PROFESSION_CATEGORIES.map((p) => (
                <option key={p} value={p}>
                  {PROFESSION_CATEGORY_LABELS[p]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Sort by" className="w-52">
          {(a) => (
            <Select
              {...a}
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as Filters['sort'] }))}
            >
              <option value="score">Compatibility score</option>
              <option value="confidence">Data confidence</option>
              <option value="age">Age (youngest first)</option>
              <option value="name">Name</option>
            </Select>
          )}
        </Field>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => setFilters((f) => ({ ...f, verifiedOnly: e.target.checked }))}
            className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-500"
          />
          Verified only
        </label>
        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Reset
          </Button>
        )}
      </section>

      {data.shortlisted.length > 0 && (
        <section aria-label="Shortlisted">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden /> Shortlisted (
            {data.shortlisted.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.shortlisted.map((r) => (
              <button
                key={r.candidate.id}
                type="button"
                onClick={() => setViewing(r.candidate.id)}
                className="flex items-center gap-2 rounded-full border border-amber-200 bg-white py-1 pl-1 pr-3 text-sm hover:bg-amber-50"
              >
                <Avatar
                  id={r.candidate.id}
                  firstName={r.candidate.firstName}
                  lastName={r.candidate.lastName}
                  size="xs"
                />
                {r.candidate.firstName} {r.candidate.lastName}
                <span className="font-semibold tabular-nums text-stone-700">{r.breakdown.score}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Suggestions" aria-busy={loading} className="space-y-4">
        {loading && (
          <div className="space-y-4" aria-hidden>
            <Skeleton className="h-40" />
          </div>
        )}
        {!loading && data.recommendations.length === 0 && (
          <div className="card">
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title={
                activeFilters ? 'No suggestions match these filters' : 'No eligible suggestions right now'
              }
              description={
                activeFilters
                  ? 'Filters narrow the ranked list without changing scores. Try widening them.'
                  : 'Everyone in the pool is either excluded by eligibility rules or already introduced. See “Why profiles were excluded” above.'
              }
              action={
                activeFilters ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                  >
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}
        {!loading &&
          data.recommendations.map((rec, i) => (
            // Cards rise in one after another; the delay is capped so long lists don't lag.
            <div
              key={rec.candidate.id}
              className="animate-rise-in"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <SuggestionCard
                rec={rec}
                rank={filters.sort === 'score' ? i + 1 : undefined}
                customerId={id}
                customerName={customer.firstName}
                busy={busyId === rec.candidate.id}
                onView={() => setViewing(rec.candidate.id)}
                onSend={() => setSending({ candidate: rec.candidate, breakdown: rec.breakdown })}
                onShortlist={async () => {
                  const next = rec.decision === 'shortlisted' ? 'none' : 'shortlisted';
                  if (await decide(rec.candidate.id, next))
                    toast.success(
                      next === 'none' ? 'Removed from shortlist' : `${rec.candidate.firstName} shortlisted`,
                    );
                }}
                onDismiss={() => {
                  setReason('');
                  setDismissing(rec);
                }}
              />
            </div>
          ))}
      </section>

      {data.dismissed.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-semibold text-stone-700">
            Dismissed suggestions ({data.dismissed.length})
          </summary>
          <ul className="mt-3 divide-y divide-stone-100">
            {data.dismissed.map((d) => (
              <li key={d.candidate.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Avatar
                  id={d.candidate.id}
                  firstName={d.candidate.firstName}
                  lastName={d.candidate.lastName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    {d.candidate.firstName} {d.candidate.lastName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {d.reason ? `“${d.reason}” · ` : ''}
                    {formatDate(d.decidedAt)}
                  </p>
                </div>
                <Badge>Not a fit</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Undo2 className="h-3.5 w-3.5" />}
                  disabled={busyId === d.candidate.id}
                  onClick={async () => {
                    if (await decide(d.candidate.id, 'none'))
                      toast.success(`${d.candidate.firstName} restored to suggestions`);
                  }}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <CandidateDrawer
        open={!!viewing}
        onClose={() => setViewing(null)}
        customerId={id}
        candidateId={viewing ?? ''}
        customerName={customer.firstName}
        onSend={(candidate, breakdown) => {
          setViewing(null);
          setSending({ candidate, breakdown });
        }}
      />

      {sending && (
        <SendMatchModal
          open
          onClose={() => setSending(null)}
          customer={customer}
          candidate={sending.candidate}
          breakdown={sending.breakdown}
          onSent={(match) => {
            setCelebrating(match);
            void reload();
          }}
        />
      )}

      {celebrating?.customer && celebrating.candidate && (
        <MatchCelebration
          customer={celebrating.customer}
          candidate={celebrating.candidate}
          onDone={endCelebration}
        />
      )}

      <ConfirmDialog
        open={!!dismissing}
        title={`Mark ${dismissing?.candidate.firstName ?? ''} as not a fit?`}
        description="They will be removed from this customer’s suggestions. You can restore them later."
        confirmLabel="Dismiss suggestion"
        busy={!!dismissing && busyId === dismissing.candidate.id}
        onClose={() => setDismissing(null)}
        onConfirm={async () => {
          if (!dismissing) return;
          if (await decide(dismissing.candidate.id, 'dismissed', reason.trim())) {
            toast.success(
              `${dismissing.candidate.firstName} dismissed`,
              'Recorded in the activity timeline.',
            );
            setDismissing(null);
          }
        }}
      >
        <Field label="Reason (optional)" hint="Helps other matchmakers understand the decision.">
          {(a) => (
            <Textarea
              {...a}
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
