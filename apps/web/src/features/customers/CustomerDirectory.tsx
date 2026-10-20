import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MessageSquarePlus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { CustomerListItem, CustomerSortField } from '@tdc/shared';
import {
  GENDERS,
  GENDER_LABELS,
  JOURNEY_STATUSES,
  JOURNEY_STATUS_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  VERIFICATION_LABELS,
  VERIFICATION_STATUSES,
} from '@tdc/shared';
import { JourneyBadge, VerificationBadge } from '../../components/StatusBadges';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Input, Select } from '../../components/ui/Field';
import { Pagination } from '../../components/ui/Layout';
import { useApi, useDebounced } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { cn, daysSince, formatDate, orDash, relativeTime } from '../../lib/format';

interface Filters {
  search: string;
  journeyStatus: string;
  gender: string;
  verification: string;
  maritalStatus: string;
  sort: CustomerSortField;
  order: 'asc' | 'desc';
  page: number;
}

const DEFAULTS: Filters = {
  search: '',
  journeyStatus: '',
  gender: '',
  verification: '',
  maritalStatus: '',
  sort: 'lastContacted',
  order: 'desc',
  page: 1,
};
const FILTER_KEYS = ['search', 'journeyStatus', 'gender', 'verification', 'maritalStatus'] as const;

/** Filter state lives in the URL on the Customers page (shareable, back-button friendly) and locally elsewhere. */
function useFilters(syncUrl: boolean): [Filters, (patch: Partial<Filters>) => void] {
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState<Filters>(DEFAULTS);
  const fromUrl: Filters = {
    ...DEFAULTS,
    ...Object.fromEntries([...params.entries()].filter(([k]) => k in DEFAULTS)),
    page: Number(params.get('page') ?? 1) || 1,
  } as Filters;
  const state = syncUrl ? fromUrl : local;
  const update = (patch: Partial<Filters>) => {
    const next = { ...state, ...patch, page: patch.page ?? 1 };
    if (!syncUrl) return setLocal(next);
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== '' && v !== DEFAULTS[k as keyof Filters]) p.set(k, String(v));
    setParams(p, { replace: true });
  };
  return [state, update];
}

function SortHeader({
  label,
  field,
  filters,
  onSort,
  className,
}: {
  label: string;
  field: CustomerSortField;
  filters: Filters;
  onSort: (f: CustomerSortField) => void;
  className?: string;
}) {
  const active = filters.sort === field;
  const Icon = !active ? ArrowUpDown : filters.order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded hover:text-stone-900"
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-brand-600' : 'text-stone-300')} aria-hidden />
      </button>
    </th>
  );
}

export function CustomerDirectory({
  syncUrl = false,
  pageSize = 10,
  compact = false,
}: {
  syncUrl?: boolean;
  pageSize?: number;
  compact?: boolean;
}) {
  const [filters, update] = useFilters(syncUrl);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const search = useDebounced(searchDraft, 250);
  const navigate = useNavigate();

  // Push the debounced search into the filters only when the debounced value itself changes.
  const latest = useRef({ filters, update });
  latest.current = { filters, update };
  useEffect(() => {
    if (search !== latest.current.filters.search) latest.current.update({ search });
  }, [search]);

  const query = useMemo(() => ({ ...filters, pageSize }), [filters, pageSize]);
  const { data, meta, loading, error, reload } = useApi(
    () => api.get<CustomerListItem[]>('/customers', query),
    JSON.stringify(query),
  );

  const activeFilters = FILTER_KEYS.filter((k) => filters[k] !== '').length;
  const reset = () => {
    setSearchDraft('');
    update({ ...DEFAULTS });
  };
  const onSort = (field: CustomerSortField) =>
    update({
      sort: field,
      order:
        filters.sort === field
          ? filters.order === 'asc'
            ? 'desc'
            : 'asc'
          : field === 'name'
            ? 'asc'
            : 'desc',
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-5 py-3.5">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search customers by name, city or profession"
            placeholder="Search name, city or profession"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by journey status"
          value={filters.journeyStatus}
          onChange={(e) => update({ journeyStatus: e.target.value })}
          className="w-auto"
        >
          <option value="">All journey stages</option>
          {JOURNEY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {JOURNEY_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by verification"
          value={filters.verification}
          onChange={(e) => update({ verification: e.target.value })}
          className="w-auto"
        >
          <option value="">Any verification</option>
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {VERIFICATION_LABELS[s]}
            </option>
          ))}
        </Select>
        {!compact && (
          <>
            <Select
              aria-label="Filter by gender"
              value={filters.gender}
              onChange={(e) => update({ gender: e.target.value })}
              className="w-auto"
            >
              <option value="">Any gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by marital status"
              value={filters.maritalStatus}
              onChange={(e) => update({ maritalStatus: e.target.value })}
              className="w-auto"
            >
              <option value="">Any marital status</option>
              {MARITAL_STATUSES.map((m) => (
                <option key={m} value={m}>
                  {MARITAL_STATUS_LABELS[m]}
                </option>
              ))}
            </Select>
          </>
        )}
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={reset}>
            Reset filters
          </Button>
        )}
      </div>

      {error ? (
        <div className="p-5">
          <ErrorState message={error.message} onRetry={() => void reload()} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 text-xs font-medium text-stone-500">
              <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
                <SortHeader
                  label="Customer"
                  field="name"
                  filters={filters}
                  onSort={onSort}
                  className="pl-5"
                />
                <SortHeader label="Age" field="age" filters={filters} onSort={onSort} />
                <th scope="col" className="hidden md:table-cell">
                  Gender
                </th>
                <th scope="col">City</th>
                <th scope="col" className="hidden xl:table-cell">
                  Marital status
                </th>
                <th scope="col">Verification</th>
                <SortHeader label="Journey" field="journeyStatus" filters={filters} onSort={onSort} />
                <SortHeader label="Last contact" field="lastContacted" filters={filters} onSort={onSort} />
                <th scope="col" className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading && !data
                ? Array.from({ length: Math.min(pageSize, 6) }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-5 py-3">
                        <Skeleton className="h-8" />
                      </td>
                    </tr>
                  ))
                : data?.map((c) => {
                    const stale =
                      (daysSince(c.lastContactedAt) ?? 999) > 14 &&
                      !['matched', 'on_hold'].includes(c.journeyStatus);
                    return (
                      <tr
                        key={c.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('a,button')) return;
                          navigate(`/customers/${c.id}`);
                        }}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-brand-50/40 [&>td]:px-4 [&>td]:py-3',
                          loading && 'opacity-60',
                        )}
                      >
                        <td className="!pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar id={c.id} firstName={c.firstName} lastName={c.lastName} size="sm" />
                            <div className="min-w-0">
                              <Link
                                to={`/customers/${c.id}`}
                                className="font-medium text-stone-900 hover:text-brand-700"
                              >
                                {c.firstName} {c.lastName}
                              </Link>
                              <p className="truncate text-xs text-stone-500">{orDash(c.profession)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="tabular-nums text-stone-700">{orDash(c.age)}</td>
                        <td className="hidden text-stone-700 md:table-cell">
                          {c.gender ? GENDER_LABELS[c.gender] : '—'}
                        </td>
                        <td className="text-stone-700">{orDash(c.city)}</td>
                        <td className="hidden text-stone-700 xl:table-cell">
                          {c.maritalStatus ? MARITAL_STATUS_LABELS[c.maritalStatus] : '—'}
                        </td>
                        <td>
                          <VerificationBadge status={c.verificationStatus} compact />
                        </td>
                        <td>
                          <JourneyBadge status={c.journeyStatus} />
                        </td>
                        <td className="whitespace-nowrap">
                          <span
                            className={cn('text-stone-700', stale && 'font-medium text-amber-700')}
                            title={formatDate(c.lastContactedAt)}
                          >
                            {relativeTime(c.lastContactedAt)}
                          </span>
                        </td>
                        <td className="!pr-5">
                          <div className="flex justify-end gap-0.5">
                            <Link
                              to={`/customers/${c.id}`}
                              aria-label={`View ${c.firstName}'s profile`}
                              title="View profile"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/customers/${c.id}?tab=notes`}
                              aria-label={`Log a note for ${c.firstName}`}
                              title="Log note"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/customers/${c.id}/matches`}
                              aria-label={`Find matches for ${c.firstName}`}
                              title="Find matches"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && data?.length === 0 && (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title={activeFilters ? 'No customers match these filters' : 'No customers assigned yet'}
              description={
                activeFilters
                  ? 'Try a different search term or clear the filters.'
                  : 'Customers assigned to you will appear here.'
              }
              action={
                activeFilters ? (
                  <Button variant="secondary" size="sm" onClick={reset}>
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      )}
      {meta && meta.total > 0 && (
        <Pagination meta={meta} onPage={(page) => update({ page })} noun="customers" />
      )}
    </div>
  );
}
