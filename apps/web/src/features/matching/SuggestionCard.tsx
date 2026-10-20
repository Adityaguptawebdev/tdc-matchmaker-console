import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Eye, Send, Star, ThumbsDown, XCircle } from 'lucide-react';
import type { Recommendation } from '@tdc/shared';
import { MARITAL_STATUS_LABELS } from '@tdc/shared';
import { BandBadge, ScoreRing, VerificationBadge } from '../../components/StatusBadges';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cn, orDash } from '../../lib/format';
import { AiExplanationPanel } from './AiExplanationPanel';
import { DirectionalFit, ScoreBreakdown } from './ScoreBreakdown';

interface Props {
  rec: Recommendation;
  rank?: number;
  customerId: string;
  customerName: string;
  onView: () => void;
  onSend: () => void;
  onShortlist: () => void;
  onDismiss: () => void;
  busy?: boolean;
}

export function SuggestionCard({
  rec,
  rank,
  customerId,
  customerName,
  onView,
  onSend,
  onShortlist,
  onDismiss,
  busy,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { candidate: c, breakdown: b } = rec;
  const shortlisted = rec.decision === 'shortlisted';
  const conflicts = b.categories.flatMap((cat) => cat.checks).filter((x) => x.outcome === 'conflict').length;
  const detailsId = `why-${c.id}`;

  return (
    <article
      className={cn('card overflow-hidden', shortlisted && 'border-amber-300')}
      aria-labelledby={`name-${c.id}`}
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row">
        <div className="flex min-w-0 flex-1 gap-4">
          <Avatar id={c.id} firstName={c.firstName} lastName={c.lastName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {rank !== undefined && (
                <span className="text-xs font-semibold tabular-nums text-stone-400">#{rank}</span>
              )}
              <h3 id={`name-${c.id}`} className="text-base font-semibold text-stone-900">
                {c.firstName} {c.lastName}
              </h3>
              {shortlisted && (
                <Badge tone="amber" icon={<Star className="h-3 w-3 fill-current" aria-hidden />}>
                  Shortlisted
                </Badge>
              )}
              {c.kind === 'client' && <Badge tone="sky">TDC client</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-stone-600">
              {orDash(c.age)} · {orDash(c.city)}
              {c.country && c.country !== 'India' ? `, ${c.country}` : ''} ·{' '}
              {orDash(c.designation ?? c.profession)}
              {c.company ? ` at ${c.company}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <VerificationBadge status={c.verificationStatus} compact />
              {c.maritalStatus && <Badge>{MARITAL_STATUS_LABELS[c.maritalStatus]}</Badge>}
              {c.educationDegree && <Badge>{c.educationDegree}</Badge>}
              {conflicts > 0 && (
                <Badge tone="rose" icon={<XCircle className="h-3 w-3" aria-hidden />}>
                  {conflicts} conflict{conflicts > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <ul className="mt-3 space-y-1">
              {b.explanation.strengths.slice(0, 3).map((s) => (
                <li key={s} className="flex gap-2 text-sm text-stone-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {s}
                </li>
              ))}
              {b.explanation.considerations.slice(0, 2).map((s) => (
                <li key={s} className="flex gap-2 text-sm text-stone-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-4 border-t border-stone-100 pt-4 md:w-56 md:flex-col md:items-stretch md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="flex items-center gap-3">
            <ScoreRing score={b.score} band={b.band} />
            <BandBadge band={b.band} confidence={b.confidence} />
          </div>
          <div className="hidden md:block">
            <DirectionalFit breakdown={b} customerName={customerName} candidateName={c.firstName} stacked />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
          Why this match
        </Button>
        <Button variant="ghost" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={onView}>
          View profile
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={shortlisted}
            icon={<Star className={cn('h-3.5 w-3.5', shortlisted && 'fill-amber-400 text-amber-500')} />}
            onClick={onShortlist}
            disabled={busy}
          >
            {shortlisted ? 'Shortlisted' : 'Shortlist'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<ThumbsDown className="h-3.5 w-3.5" />}
            onClick={onDismiss}
            disabled={busy}
          >
            Not a fit
          </Button>
          <Button size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={onSend}>
            Send match
          </Button>
        </div>
      </div>

      {expanded && (
        <div id={detailsId} className="space-y-4 border-t border-stone-100 p-5">
          <p className="text-sm text-stone-700">{b.explanation.headline}</p>
          <ScoreBreakdown breakdown={b} customerName={customerName} candidateName={c.firstName} />
          <AiExplanationPanel customerId={customerId} candidateId={c.id} />
        </div>
      )}
    </article>
  );
}
