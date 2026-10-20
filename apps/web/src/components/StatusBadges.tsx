import { useEffect, useState } from 'react';
import { BadgeCheck, Clock3, ShieldAlert } from 'lucide-react';
import type { ConfidenceLevel, JourneyStatus, MatchStatus, ScoreBand, VerificationStatus } from '@tdc/shared';
import {
  CONFIDENCE_LABELS,
  JOURNEY_STATUS_LABELS,
  MATCH_STATUS_LABELS,
  SCORE_BAND_LABELS,
  VERIFICATION_LABELS,
} from '@tdc/shared';
import { cn } from '../lib/format';
import { Badge, type Tone } from './ui/Badge';

const JOURNEY_TONES: Record<JourneyStatus, Tone> = {
  new: 'sky',
  onboarding: 'teal',
  awaiting_matches: 'amber',
  matches_sent: 'brand',
  meeting_scheduled: 'violet',
  in_discussion: 'brand',
  on_hold: 'neutral',
  matched: 'green',
};

export function JourneyBadge({ status }: { status: JourneyStatus }) {
  return (
    <Badge tone={JOURNEY_TONES[status]} dot>
      {JOURNEY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function VerificationBadge({ status, compact }: { status: VerificationStatus; compact?: boolean }) {
  const map = {
    verified: { tone: 'green' as const, Icon: BadgeCheck, short: 'Verified' },
    pending: { tone: 'amber' as const, Icon: Clock3, short: 'Pending' },
    unverified: { tone: 'neutral' as const, Icon: ShieldAlert, short: 'Unverified' },
  }[status];
  return (
    <Badge
      tone={map.tone}
      icon={<map.Icon className="h-3.5 w-3.5" aria-hidden />}
      title={VERIFICATION_LABELS[status]}
    >
      {compact ? map.short : VERIFICATION_LABELS[status]}
    </Badge>
  );
}

const MATCH_TONES: Record<MatchStatus, Tone> = {
  pending: 'amber',
  interested: 'green',
  not_interested: 'neutral',
  meeting_scheduled: 'violet',
  rejected: 'rose',
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return (
    <Badge tone={MATCH_TONES[status]} dot>
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}

const BAND_STYLES: Record<ScoreBand, { ring: string; text: string; tone: Tone }> = {
  high: { ring: 'stroke-emerald-600', text: 'text-emerald-700', tone: 'green' },
  good: { ring: 'stroke-brand-600', text: 'text-brand-700', tone: 'brand' },
  explore: { ring: 'stroke-amber-500', text: 'text-amber-700', tone: 'amber' },
  low: { ring: 'stroke-stone-400', text: 'text-stone-600', tone: 'neutral' },
};

/** Circular 0–100 score with its band label. The number is a compatibility score, not a probability. */
export function ScoreRing({ score, band, size = 64 }: { score: number; band: ScoreBand; size?: number }) {
  const stroke = size >= 60 ? 6 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Start empty and fill to the score on the next frame, so the ring animates in (instant under reduced motion).
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compatibility score ${score} out of 100, ${SCORE_BAND_LABELS[band]}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-stone-100"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          className={BAND_STYLES[band].ring}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-stone-900',
          size >= 60 ? 'text-lg' : 'text-sm',
        )}
      >
        {score}
      </span>
    </div>
  );
}

export function BandBadge({ band, confidence }: { band: ScoreBand; confidence?: ConfidenceLevel }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={BAND_STYLES[band].tone}>{SCORE_BAND_LABELS[band]}</Badge>
      {confidence && (
        <span
          className={cn('text-xs', confidence === 'low' ? 'font-medium text-amber-700' : 'text-stone-500')}
        >
          {CONFIDENCE_LABELS[confidence]}
        </span>
      )}
    </span>
  );
}
