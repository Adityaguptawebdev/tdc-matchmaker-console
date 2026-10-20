import { AlertTriangle, CheckCircle2, ChevronDown, HelpCircle, MinusCircle, XCircle } from 'lucide-react';
import type { CheckDirection, CheckOutcome, MatchBreakdown } from '@tdc/shared';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/format';

const OUTCOME: Record<CheckOutcome, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  match: { Icon: CheckCircle2, className: 'text-emerald-600', label: 'Compatible' },
  partial: { Icon: MinusCircle, className: 'text-amber-600', label: 'Partly compatible' },
  conflict: { Icon: XCircle, className: 'text-rose-600', label: 'Conflict' },
  unknown: { Icon: HelpCircle, className: 'text-stone-400', label: 'Unknown — missing data' },
};

const barColor = (score: number) =>
  score >= 80
    ? 'bg-emerald-500'
    : score >= 65
      ? 'bg-brand-500'
      : score >= 50
        ? 'bg-amber-500'
        : 'bg-rose-400';

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-stone-600">{label}</span>
        <span className="font-semibold tabular-nums text-stone-900">{value}</span>
      </div>
      <div
        className="mt-1 h-1.5 rounded-full bg-stone-100"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn('h-1.5 rounded-full', barColor(value))} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** Mutual-fit summary: how well each person's own stated preferences are met. */
export function DirectionalFit({
  breakdown,
  customerName,
  candidateName,
  stacked,
}: {
  breakdown: MatchBreakdown;
  customerName: string;
  candidateName: string;
  stacked?: boolean;
}) {
  return (
    <div className={cn('flex', stacked ? 'flex-col gap-2.5' : 'gap-4')}>
      <Meter label={`Meets ${customerName}’s preferences`} value={breakdown.directional.forCustomer} />
      <Meter label={`Meets ${candidateName}’s preferences`} value={breakdown.directional.forCandidate} />
    </div>
  );
}

export function ScoreBreakdown({
  breakdown,
  customerName,
  candidateName,
}: {
  breakdown: MatchBreakdown;
  customerName: string;
  candidateName: string;
}) {
  const directionLabel = (d: CheckDirection) =>
    d === 'mutual'
      ? 'Mutual'
      : d === 'forward'
        ? `${customerName}’s preference`
        : `${candidateName}’s preference`;
  return (
    <div className="space-y-4">
      <DirectionalFit breakdown={breakdown} customerName={customerName} candidateName={candidateName} />

      {breakdown.warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
          {breakdown.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="divide-y divide-stone-100 rounded-lg border border-stone-200">
        {breakdown.categories.map((cat) => (
          <details key={cat.key} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
              <div className="w-44 shrink-0 sm:w-52">
                <p className="text-sm font-medium text-stone-800">{cat.label}</p>
                <p className="text-[11px] text-stone-500">
                  {cat.weight > 0 ? `Weight ${cat.weight}%` : 'Not applicable'}
                  {cat.weight > 0 && ` · evidence ${Math.round(cat.evidence * 100)}%`}
                </p>
              </div>
              <div className="flex flex-1 items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-stone-100">
                  {cat.weight > 0 && (
                    <div
                      className={cn('h-2 rounded-full', barColor(cat.score))}
                      style={{ width: `${cat.score}%` }}
                    />
                  )}
                </div>
                <span className="w-9 text-right text-sm font-semibold tabular-nums text-stone-900">
                  {cat.weight > 0 ? Math.round(cat.score) : '—'}
                </span>
              </div>
              <ChevronDown
                className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="space-y-2 px-3.5 pb-3.5 pt-1">
              {cat.checks.length === 0 && (
                <li className="text-xs text-stone-500">
                  Neither person stated a preference here, so its weight was redistributed.
                </li>
              )}
              {cat.checks.map((check) => {
                const o = OUTCOME[check.outcome];
                return (
                  <li key={check.id} className="flex gap-2.5 text-sm">
                    <o.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', o.className)} aria-label={o.label} />
                    <div className="min-w-0">
                      <p className="text-stone-800">
                        {check.detail.replace(' (assignment default rule)', '')}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="text-[11px] text-stone-500">{check.label}</span>
                        <span className="text-[11px] text-stone-300">·</span>
                        <span className="text-[11px] text-stone-500">{directionLabel(check.direction)}</span>
                        {check.source === 'default_rule' && (
                          <Badge
                            tone="amber"
                            className="!px-1.5 !py-0 !text-[10px]"
                            title="Not stated by the customer; the configured assignment rule was applied"
                          >
                            Default rule
                          </Badge>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>

      {breakdown.explanation.assumptions.length > 0 && (
        <div className="rounded-lg bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600">
          <p className="mb-1 font-semibold text-stone-700">Assumptions applied</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {breakdown.explanation.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-stone-500">
        Scores compare both people’s stated preferences using configurable weights (engine v
        {breakdown.engineVersion}, {breakdown.weightProfile.replace('_', ' ')} profile). They are a guide for
        matchmakers — not a prediction of relationship success.
      </p>
    </div>
  );
}
