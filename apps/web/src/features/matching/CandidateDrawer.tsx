import { Ban, Send } from 'lucide-react';
import type { CandidateEvaluation, CandidateSummary, MatchBreakdown } from '@tdc/shared';
import { toSummary } from './mappers';
import { EXCLUSION_REASON_LABELS, type ExclusionReason } from '@tdc/shared';
import { BandBadge, MatchStatusBadge, ScoreRing, VerificationBadge } from '../../components/StatusBadges';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Dialog';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { formatDate, orDash } from '../../lib/format';
import {
  BackgroundSection,
  CareerSection,
  LifestyleSection,
  PersonalSection,
  PreferencesSection,
} from '../customers/ProfileSections';
import { AiExplanationPanel } from './AiExplanationPanel';
import { ScoreBreakdown } from './ScoreBreakdown';

function DrawerBody({ customerId, candidateId, customerName, onSend }: Props) {
  const { data, loading, error, reload } = useApi(
    () => api.get<CandidateEvaluation>(`/customers/${customerId}/recommendations/${candidateId}`),
    `${customerId}/${candidateId}`,
  );
  if (error) return <ErrorState message={error.message} onRetry={() => void reload()} />;
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  const c = data.candidate;
  const canSend = data.eligibility.eligible && !data.alreadySent;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar id={c.id} firstName={c.firstName} lastName={c.lastName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-stone-900">
            {c.firstName} {c.lastName}
          </p>
          <p className="text-sm text-stone-500">
            {orDash(c.age)} · {orDash(c.city)} · {orDash(c.career.designation ?? c.career.profession)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <VerificationBadge status={c.verification.status} />
            <BandBadge band={data.breakdown.band} confidence={data.breakdown.confidence} />
          </div>
        </div>
        <ScoreRing score={data.breakdown.score} band={data.breakdown.band} />
      </div>

      {!data.eligibility.eligible && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          <p className="flex items-center gap-2 font-semibold">
            <Ban className="h-4 w-4" aria-hidden /> Not eligible for {customerName}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {data.eligibility.reasons.map((r) => (
              <li key={r.code + r.detail}>
                <span className="font-medium">
                  {EXCLUSION_REASON_LABELS[r.code as ExclusionReason] ?? r.code}:
                </span>{' '}
                {r.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.alreadySent && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          Introduced on {formatDate(data.alreadySent.sentAt)} by {data.alreadySent.matchmakerName} ·{' '}
          <MatchStatusBadge status={data.alreadySent.status} />
        </div>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Why this score</h3>
        <ScoreBreakdown breakdown={data.breakdown} customerName={customerName} candidateName={c.firstName} />
        <div className="mt-4">
          <AiExplanationPanel customerId={customerId} candidateId={candidateId} />
        </div>
      </section>

      <PersonalSection p={c} />
      <CareerSection p={c} />
      <BackgroundSection p={c} />
      <LifestyleSection p={c} />
      <PreferencesSection p={c} />

      {canSend && (
        <div className="sticky bottom-0 -mx-6 border-t border-stone-100 bg-white/95 px-6 py-3 backdrop-blur">
          <Button
            className="w-full"
            icon={<Send className="h-4 w-4" />}
            onClick={() => onSend(toSummary(c), data.breakdown)}
          >
            Send match to {customerName}
          </Button>
        </div>
      )}
    </div>
  );
}

interface Props {
  customerId: string;
  candidateId: string;
  customerName: string;
  onSend: (candidate: CandidateSummary, breakdown: MatchBreakdown) => void;
}

export function CandidateDrawer({ open, onClose, ...props }: Props & { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Candidate profile"
      description="Contact details are hidden until an introduction is accepted."
    >
      {open && <DrawerBody {...props} />}
    </Drawer>
  );
}
