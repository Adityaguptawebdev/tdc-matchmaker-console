import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Crown, Mail, MapPin, PhoneCall, Sparkles, UserRound } from 'lucide-react';
import type { CustomerDetail, JourneyStatus } from '@tdc/shared';
import { GENDER_LABELS, JOURNEY_STATUSES, JOURNEY_STATUS_LABELS, MEMBERSHIP_TIER_LABELS } from '@tdc/shared';
import { JourneyBadge, VerificationBadge } from '../components/StatusBadges';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState, PageSkeleton } from '../components/ui/Feedback';
import { Field, Select } from '../components/ui/Field';
import { Card, CardHeader, Detail, TabPanel, Tabs } from '../components/ui/Layout';
import { useToast } from '../components/ui/Toast';
import {
  BackgroundSection,
  CareerSection,
  LifestyleSection,
  PersonalSection,
  PreferencesSection,
} from '../features/customers/ProfileSections';
import { CustomerMatchesPanel } from '../features/matching/CustomerMatchesPanel';
import { NotesPanel } from '../features/notes/NotesPanel';
import { useSystem } from '../features/system';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/api';
import { cn, daysSince, formatDate, orDash, relativeTime } from '../lib/format';

const TABS = ['profile', 'preferences', 'notes', 'matches'] as const;
type Tab = (typeof TABS)[number];

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'profile';
  const toast = useToast();
  const system = useSystem();
  const {
    data: c,
    loading,
    error,
    reload,
    setData,
  } = useApi(() => api.get<CustomerDetail>(`/customers/${id}`), id);
  const [pendingStatus, setPendingStatus] = useState<JourneyStatus | null>(null);
  const [confirmContact, setConfirmContact] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading && !c) return <PageSkeleton />;
  if (error?.status === 404)
    return <ErrorState message="This customer doesn’t exist or isn’t assigned to you." />;
  if (error || !c)
    return <ErrorState message={error?.message ?? 'Not found'} onRetry={() => void reload()} />;

  const mm = c.matchmaking!;
  const stale = (daysSince(mm.lastContactedAt) ?? 999) > 14;

  const patch = async (
    body: { journeyStatus?: JourneyStatus; lastContactedAt?: string },
    success: string,
  ) => {
    setSaving(true);
    try {
      const res = await api.patch<CustomerDetail>(`/customers/${id}`, body);
      setData(() => res.data);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error('Update failed', errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All customers
      </Link>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar id={c.id} firstName={c.firstName} lastName={c.lastName} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                {c.firstName} {c.lastName}
              </h1>
              <VerificationBadge status={c.verification.status} />
              <JourneyBadge status={mm.journeyStatus} />
              <Badge tone="brand" icon={<Crown className="h-3 w-3" aria-hidden />}>
                {MEMBERSHIP_TIER_LABELS[mm.membershipTier]}
              </Badge>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
              <span className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-stone-400" aria-hidden />
                {orDash(c.age)} · {c.gender ? GENDER_LABELS[c.gender] : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-stone-400" aria-hidden />
                {orDash(c.city)}, {orDash(c.country)}
              </span>
              <span>{orDash(c.career.designation ?? c.career.profession)}</span>
              {c.contact.email && (
                <a
                  href={`mailto:${c.contact.email}`}
                  className="flex items-center gap-1.5 text-brand-700 hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden /> {c.contact.email}
                </a>
              )}
            </p>
            {c.about && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600">{c.about}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <ButtonLink to={`/customers/${id}/matches`} icon={<Sparkles className="h-4 w-4" />}>
              Find compatible matches
            </ButtonLink>
            <Button
              variant="secondary"
              icon={<PhoneCall className="h-4 w-4" />}
              onClick={() => setParams({ tab: 'notes' })}
            >
              Log call or note
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Tabs
            idPrefix="customer"
            active={tab}
            onChange={(t) => setParams(t === 'profile' ? {} : { tab: t }, { replace: true })}
            tabs={[
              { id: 'profile', label: 'Profile' },
              { id: 'preferences', label: 'Preferences' },
              { id: 'notes', label: 'Notes' },
              { id: 'matches', label: 'Matches & feedback', count: c.stats.matchesSent },
            ]}
          />
          <TabPanel id="profile" idPrefix="customer" active={tab}>
            <div className="space-y-4">
              <PersonalSection p={c} />
              <CareerSection p={c} />
              <BackgroundSection p={c} />
              <LifestyleSection p={c} />
            </div>
          </TabPanel>
          <TabPanel id="preferences" idPrefix="customer" active={tab}>
            <PreferencesSection
              p={c}
              isCustomer
              assignmentDefaults={system?.matching.assignmentRulesEnabled ?? true}
            />
          </TabPanel>
          <TabPanel id="notes" idPrefix="customer" active={tab}>
            <NotesPanel customerId={id} customerName={c.firstName} onChanged={() => void reload()} />
          </TabPanel>
          <TabPanel id="matches" idPrefix="customer" active={tab}>
            <CustomerMatchesPanel
              customerId={id}
              customerName={c.firstName}
              onChanged={() => void reload()}
            />
          </TabPanel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader title="Matchmaking" />
            <div className="space-y-4 p-5">
              <Field label="Journey status">
                {(a) => (
                  <Select
                    {...a}
                    value={mm.journeyStatus}
                    disabled={saving}
                    onChange={(e) => setPendingStatus(e.target.value as JourneyStatus)}
                  >
                    {JOURNEY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {JOURNEY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <dl className="space-y-3">
                <Detail label="Matchmaker">{c.owner ? `${c.owner.name} · ${c.owner.title}` : '—'}</Detail>
                <Detail label="Last contacted">
                  <span className={cn(stale && 'font-medium text-amber-700')}>
                    {relativeTime(mm.lastContactedAt)}
                  </span>
                  {mm.lastContactedAt && (
                    <span className="text-stone-500"> · {formatDate(mm.lastContactedAt)}</span>
                  )}
                </Detail>
                <Detail label="Member since">{formatDate(mm.joinedAt)}</Detail>
              </dl>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                onClick={() => setConfirmContact(true)}
                disabled={saving}
              >
                Mark contacted today
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Match activity" />
            <dl className="grid grid-cols-2 gap-4 p-5">
              <Detail label="Introductions sent">
                <span className="text-lg font-semibold tabular-nums">{c.stats.matchesSent}</span>
              </Detail>
              <Detail label="Active">
                <span className="text-lg font-semibold tabular-nums">{c.stats.activeMatches}</span>
              </Detail>
              <Detail label="Meetings">
                <span className="text-lg font-semibold tabular-nums">{c.stats.meetingsScheduled}</span>
              </Detail>
              <Detail label="Shortlisted">
                <span className="text-lg font-semibold tabular-nums">{c.stats.shortlisted}</span>
              </Detail>
            </dl>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={!!pendingStatus}
        title="Change journey status?"
        description={
          pendingStatus
            ? `${JOURNEY_STATUS_LABELS[mm.journeyStatus]} → ${JOURNEY_STATUS_LABELS[pendingStatus]}`
            : undefined
        }
        confirmLabel="Update status"
        busy={saving}
        onClose={() => setPendingStatus(null)}
        onConfirm={async () => {
          if (
            pendingStatus &&
            (await patch(
              { journeyStatus: pendingStatus },
              `Journey status set to ${JOURNEY_STATUS_LABELS[pendingStatus]}`,
            ))
          )
            setPendingStatus(null);
        }}
      />
      <ConfirmDialog
        open={confirmContact}
        title={`Mark ${c.firstName} as contacted today?`}
        description="Updates “last contacted” and adds an entry to the activity timeline. To record what was discussed, log a note instead."
        confirmLabel="Mark contacted"
        busy={saving}
        onClose={() => setConfirmContact(false)}
        onConfirm={async () => {
          if (await patch({ lastContactedAt: new Date().toISOString() }, 'Last contacted date updated'))
            setConfirmContact(false);
        }}
      />
    </div>
  );
}
