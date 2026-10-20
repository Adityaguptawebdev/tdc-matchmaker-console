import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Sparkles } from 'lucide-react';
import type { AiExplanation } from '@tdc/shared';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api, errorMessage } from '../../lib/api';

/** Requests a narrative summary; clearly labels whether it came from AI or the deterministic fallback. */
export function AiExplanationPanel({ customerId, candidateId }: { customerId: string; candidateId: string }) {
  const [result, setResult] = useState<AiExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AiExplanation>(
        `/customers/${customerId}/recommendations/${candidateId}/explanation`,
      );
      setResult(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="subtle"
          size="sm"
          loading={loading}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => void run()}
        >
          Summarise this match
        </Button>
        <span className="text-xs text-stone-500">
          Uses AI when configured; otherwise a deterministic summary of the same facts.
        </span>
        {error && (
          <p role="alert" className="w-full text-xs text-rose-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {result.source === 'ai' ? (
          <Badge tone="brand" icon={<Sparkles className="h-3 w-3" aria-hidden />}>
            AI-generated · {result.model}
          </Badge>
        ) : (
          <Badge tone="neutral" icon={<Cpu className="h-3 w-3" aria-hidden />}>
            Deterministic fallback
          </Badge>
        )}
        {result.fallbackReason && <span className="text-xs text-stone-500">{result.fallbackReason}</span>}
      </div>
      <p className="text-sm text-stone-800">{result.summary}</p>
      {result.highlights.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.highlights.map((h) => (
            <li key={h} className="flex gap-2 text-sm text-stone-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      )}
      {result.considerations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.considerations.map((c) => (
            <li key={c} className="flex gap-2 text-sm text-stone-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              {c}
            </li>
          ))}
        </ul>
      )}
      {result.source === 'ai' && (
        <p className="mt-3 text-[11px] text-stone-500">
          AI rephrases engine facts only; it does not change eligibility or scores.
        </p>
      )}
    </div>
  );
}
