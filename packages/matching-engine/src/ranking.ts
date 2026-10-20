import type {
  EligibilityResult,
  ExclusionReason,
  MatchBreakdown,
  Profile,
  RankingSummary,
} from '@tdc/shared';
import { DEFAULT_CONFIG, type MatchingConfig } from './config';
import { checkEligibility, type PairHistoryEntry } from './eligibility';
import { scoreCompatibility } from './scoring';

export interface RankOptions {
  now: Date;
  config?: MatchingConfig;
  history?: readonly PairHistoryEntry[];
  /** Overrides config.minRecommendScore. */
  minScore?: number;
}

export interface RankedCandidate {
  candidate: Profile;
  breakdown: MatchBreakdown;
}

export interface ExcludedCandidate {
  candidateId: string;
  reasons: EligibilityResult['reasons'];
}

export interface RankingResult {
  summary: RankingSummary;
  /** Eligible candidates at or above the minimum score, best first. */
  recommended: RankedCandidate[];
  /** Eligible but below the minimum score (not recommended). */
  belowThreshold: RankedCandidate[];
  excluded: ExcludedCandidate[];
}

/** Deterministic ordering: score ↓, evidence ↓, then candidate id ↑ as a stable tie-breaker. */
export function compareRanked(a: RankedCandidate, b: RankedCandidate): number {
  return (
    b.breakdown.score - a.breakdown.score ||
    b.breakdown.evidence - a.breakdown.evidence ||
    (a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0)
  );
}

/**
 * Filters the pool by eligibility, scores every eligible candidate, applies the minimum score and ranks.
 * The result is independent of the input order of `pool`.
 */
export function rankCandidates(
  customer: Profile,
  pool: readonly Profile[],
  options: RankOptions,
): RankingResult {
  const config = options.config ?? DEFAULT_CONFIG;
  const minScore = options.minScore ?? config.minRecommendScore;
  const excluded: ExcludedCandidate[] = [];
  const scored: RankedCandidate[] = [];
  const seen = new Set<string>();

  // Sort by id first so duplicate handling ("first occurrence wins") does not depend on input order.
  const ordered = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const candidate of ordered) {
    if (seen.has(candidate.id)) {
      excluded.push({
        candidateId: candidate.id,
        reasons: [{ code: 'DUPLICATE_CANDIDATE', detail: 'Duplicate profile id in the candidate pool.' }],
      });
      continue;
    }
    seen.add(candidate.id);

    const eligibility = checkEligibility(customer, candidate, {
      now: options.now,
      config,
      history: options.history,
    });
    if (!eligibility.eligible) {
      excluded.push({ candidateId: candidate.id, reasons: eligibility.reasons });
      continue;
    }
    scored.push({
      candidate,
      breakdown: scoreCompatibility(customer, candidate, {
        now: options.now,
        config,
        warnings: eligibility.warnings,
      }),
    });
  }

  scored.sort(compareRanked);
  const recommended = scored.filter((s) => s.breakdown.score >= minScore);
  const belowThreshold = scored.filter((s) => s.breakdown.score < minScore);

  const excludedByReason: Partial<Record<ExclusionReason, number>> = {};
  for (const e of excluded) {
    // Count each candidate once, under its first (most fundamental) reason.
    const code = e.reasons[0]?.code;
    if (code) excludedByReason[code] = (excludedByReason[code] ?? 0) + 1;
  }

  return {
    summary: {
      evaluated: pool.length,
      eligible: scored.length,
      recommended: recommended.length,
      belowThreshold: belowThreshold.length,
      excludedByReason,
      minScore,
    },
    recommended,
    belowThreshold,
    excluded,
  };
}
