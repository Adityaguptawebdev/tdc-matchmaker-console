import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  BadgeCheck,
  CalendarHeart,
  Clock,
  Hourglass,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardData } from '@tdc/shared';
import { JOURNEY_STATUS_LABELS, MATCH_STATUS_LABELS } from '@tdc/shared';
import { JourneyBadge } from '../components/StatusBadges';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/Feedback';
import { Card, CardHeader, PageHeader } from '../components/ui/Layout';
import { ActivityFeed } from '../features/activity/ActivityFeed';
import { useAuth } from '../features/auth/AuthContext';
import { CustomerDirectory } from '../features/customers/CustomerDirectory';
import { DistributionChart } from '../features/customers/DistributionChart';
import { useApi } from '../hooks/useApi';
import { useCountUp } from '../hooks/useMotion';
import { api } from '../lib/api';
import { greeting, relativeTime } from '../lib/format';

function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  index,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon: LucideIcon;
  index: number;
}) {
  const shown = useCountUp(value);
  return (
    <div className="card animate-rise-in p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <Icon className="h-4 w-4 text-stone-400" aria-hidden />
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-stone-900">
        {shown}
        {suffix && <span className="text-stone-400">{suffix}</span>}
      </p>
      {hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => api.get<DashboardData>('/dashboard'), 'dashboard');

  if (loading && !data) return <PageSkeleton />;
  if (error || !data)
    return <ErrorState message={error?.message ?? 'No data'} onRetry={() => void reload()} />;
  const t = data.totals;
  const firstName = user?.name.split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          user?.role === 'lead'
            ? `Team overview across all matchmakers · ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}`
            : `Here’s your book of clients · ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}`
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Assigned customers"
          index={0}
          value={t.assignedCustomers}
          icon={Users}
          hint={`${t.candidatePool} active profiles in pool`}
        />
        <StatCard
          label="Verified profiles"
          index={1}
          value={t.verifiedCustomers}
          suffix={`/${t.assignedCustomers}`}
          icon={BadgeCheck}
          hint="ID-verified customers"
        />
        <StatCard
          label="Awaiting matches"
          index={2}
          value={t.awaitingMatches}
          icon={Hourglass}
          hint="Ready for suggestions"
        />
        <StatCard
          label="Matches sent"
          index={3}
          value={t.matchesSent}
          icon={Send}
          hint={`${t.activeConversations} marked interested`}
        />
        <StatCard
          label="Meetings scheduled"
          index={4}
          value={t.meetingsScheduled}
          icon={CalendarHeart}
          hint="From sent introductions"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Journey pipeline"
            description="Where each of your customers is in their matchmaking journey"
          />
          <div className="px-5 py-4">
            <DistributionChart
              title="Customers by journey status"
              unit="customers"
              data={data.journeyDistribution.map((d) => ({
                label: JOURNEY_STATUS_LABELS[d.status],
                count: d.count,
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Needs attention"
            description="No contact in the last 14 days"
            icon={<Clock className="h-4 w-4" />}
          />
          {data.needsAttention.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck className="h-5 w-5" />}
              title="All caught up"
              description="Every active customer has been contacted recently."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.needsAttention.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/customers/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50"
                  >
                    <Avatar id={c.id} firstName={c.firstName} lastName={c.lastName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-amber-700">
                        {c.lastContactedAt
                          ? `Last contact ${relativeTime(c.lastContactedAt)}`
                          : 'Not contacted yet'}
                      </p>
                    </div>
                    <JourneyBadge status={c.journeyStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Customers"
          description="Search, sort and filter your assigned customers"
          action={
            <Link to="/customers" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Open full list →
            </Link>
          }
        />
        <CustomerDirectory pageSize={5} compact />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            icon={<ActivityIcon className="h-4 w-4" />}
            action={
              <Link to="/activity" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all →
              </Link>
            }
          />
          <div className="px-5 pt-5">
            {data.recentActivity.length ? (
              <ActivityFeed items={data.recentActivity} dense />
            ) : (
              <EmptyState icon={<ActivityIcon className="h-5 w-5" />} title="No activity yet" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Introduction outcomes"
            description="Current status of every match you have sent"
          />
          <div className="px-5 py-4">
            <DistributionChart
              title="Sent introductions by status"
              unit="introductions"
              data={data.matchStatusDistribution.map((d) => ({
                label: MATCH_STATUS_LABELS[d.status],
                count: d.count,
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
