import {
  DEFAULT_CONFIG,
  checkEligibility,
  createConfig,
  normalizeCity,
  rankCandidates,
  scoreCompatibility,
  selectWeightProfile,
  type PairHistoryEntry,
  type RankedCandidate,
} from '@tdc/matching-engine';
import type {
  CandidateEvaluation,
  MatchRecord,
  Recommendation,
  RecommendationQuery,
  RecommendationsResponse,
  SuggestionDecisionInput,
} from '@tdc/shared';
import { SCORE_BAND_LABELS, fullName } from '@tdc/shared';
import { env } from '../config/env';
import { AppError, notFound } from '../lib/http';
import { nowIso, pairKey } from '../lib/ids';
import { toCandidateProfile, toCandidateSummary } from '../lib/mappers';
import type { DecisionEntity, MatchEntity, MatchmakerEntity, ProfileEntity, Store } from '../store/types';
import { getAccessibleCustomer } from './access';
import { logActivity } from './activity.service';

export const matchingConfig = createConfig({
  minRecommendScore: env.matching.minScore,
  assignmentRules: { ...DEFAULT_CONFIG.assignmentRules, enabled: env.matching.assignmentRules },
});

const REJECTED_STATUSES = new Set(['rejected', 'not_interested']);

/**
 * Pair history for a customer, in both directions: if this customer was ever introduced *as a candidate*
 * to another client, that pair also counts as already introduced.
 */
export async function loadPairHistory(store: Store, customerId: string) {
  const [asCustomer, asCandidate, decisions] = await Promise.all([
    store.matches.find({ customerId }),
    store.matches.find({ candidateId: customerId }),
    store.decisions.find({ customerId }),
  ]);
  const matches = [...asCustomer, ...asCandidate];
  const history: PairHistoryEntry[] = matches.map((m) => ({
    candidateId: m.customerId === customerId ? m.candidateId : m.customerId,
    kind: REJECTED_STATUSES.has(m.status) ? 'rejected' : 'sent',
  }));
  for (const d of decisions)
    if (d.decision === 'dismissed') history.push({ candidateId: d.candidateId, kind: 'dismissed' });
  return { history, matches, decisions };
}

function sortRecommendations(
  items: Recommendation[],
  sort: RecommendationQuery['sort'],
  order: 'asc' | 'desc',
) {
  const dir = order === 'asc' ? 1 : -1;
  const rank = new Map(items.map((r, i) => [r.candidate.id, i])); // engine order as the stable tie-breaker
  return [...items].sort((a, b) => {
    let c = 0;
    if (sort === 'score') c = a.breakdown.score - b.breakdown.score;
    else if (sort === 'confidence') c = a.breakdown.evidence - b.breakdown.evidence;
    else if (sort === 'age') c = (a.candidate.age ?? 0) - (b.candidate.age ?? 0);
    else
      c = `${a.candidate.firstName} ${a.candidate.lastName}`.localeCompare(
        `${b.candidate.firstName} ${b.candidate.lastName}`,
      );
    return c * dir || rank.get(a.candidate.id)! - rank.get(b.candidate.id)!;
  });
}

export async function getRecommendations(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  query: RecommendationQuery,
): Promise<RecommendationsResponse> {
  const customer = await getAccessibleCustomer(store, user, customerId);
  const [pool, { history, decisions }] = await Promise.all([
    store.profiles.find(),
    loadPairHistory(store, customerId),
  ]);
  const now = new Date();
  const result = rankCandidates(customer, pool, { now, config: matchingConfig, history });
  const decisionMap = new Map(decisions.map((d) => [d.candidateId, d]));

  const toRec = (r: RankedCandidate): Recommendation => ({
    candidate: toCandidateSummary(r.candidate, now),
    breakdown: r.breakdown,
    decision: decisionMap.get(r.candidate.id)?.decision ?? null,
  });

  // UI filters narrow the ranked list; they never change scores.
  const city = query.city ? normalizeCity(query.city) : null;
  const filtered = result.recommended.map(toRec).filter(({ candidate: c }) => {
    if (city && normalizeCity(c.city) !== city) return false;
    if (query.minAge !== undefined && (c.age === null || c.age < query.minAge)) return false;
    if (query.maxAge !== undefined && (c.age === null || c.age > query.maxAge)) return false;
    if (query.professionCategory && c.professionCategory !== query.professionCategory) return false;
    if (query.verifiedOnly && c.verificationStatus !== 'verified') return false;
    return true;
  });

  const scoredById = new Map(
    [...result.recommended, ...result.belowThreshold].map((r) => [r.candidate.id, r]),
  );
  const shortlisted = decisions
    .filter((d) => d.decision === 'shortlisted' && scoredById.has(d.candidateId))
    .map((d) => toRec(scoredById.get(d.candidateId)!));

  const poolById = new Map(pool.map((p) => [p.id, p]));
  const dismissed = decisions
    .filter((d) => d.decision === 'dismissed' && poolById.has(d.candidateId))
    .map((d) => ({
      candidate: toCandidateSummary(poolById.get(d.candidateId)!, now),
      reason: d.reason,
      decidedAt: d.decidedAt,
    }));

  const profile = selectWeightProfile(customer, matchingConfig);
  return {
    customer: toCandidateSummary(customer, now),
    summary: result.summary,
    recommendations: sortRecommendations(filtered, query.sort, query.order).slice(0, query.limit),
    shortlisted,
    dismissed,
    config: {
      minScore: matchingConfig.minRecommendScore,
      weightProfile: profile.name,
      weights: profile.weights,
      assignmentRulesEnabled: matchingConfig.assignmentRules.enabled,
      bands: matchingConfig.bands.map((b) => ({
        band: b.band,
        label: SCORE_BAND_LABELS[b.band],
        min: b.min,
      })),
    },
  };
}

export async function getCandidateForCustomer(
  store: Store,
  customer: ProfileEntity,
  candidateId: string,
): Promise<ProfileEntity> {
  if (candidateId === customer.id)
    throw new AppError(422, 'SAME_PROFILE', 'A customer cannot be matched with themselves.');
  const candidate = await store.profiles.findById(candidateId);
  if (!candidate) throw notFound('Candidate');
  return candidate;
}

export async function evaluatePair(store: Store, customer: ProfileEntity, candidate: ProfileEntity) {
  const { history, matches, decisions } = await loadPairHistory(store, customer.id);
  const now = new Date();
  const eligibility = checkEligibility(customer, candidate, { now, config: matchingConfig, history });
  const breakdown = scoreCompatibility(customer, candidate, {
    now,
    config: matchingConfig,
    warnings: eligibility.warnings,
  });
  const key = pairKey(customer.id, candidate.id);
  return {
    eligibility,
    breakdown,
    decision: decisions.find((d) => d.candidateId === candidate.id) ?? null,
    existingMatch: matches.find((m) => m.pairKey === key) ?? null,
  };
}

export async function evaluateCandidate(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  candidateId: string,
  hydrateMatch: (m: MatchEntity) => Promise<MatchRecord>,
): Promise<CandidateEvaluation> {
  const customer = await getAccessibleCustomer(store, user, customerId);
  const candidate = await getCandidateForCustomer(store, customer, candidateId);
  const { eligibility, breakdown, decision, existingMatch } = await evaluatePair(store, customer, candidate);
  return {
    candidate: toCandidateProfile(candidate),
    eligibility,
    breakdown,
    decision: decision?.decision ?? null,
    alreadySent: existingMatch ? await hydrateMatch(existingMatch) : null,
  };
}

export async function setSuggestionDecision(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  candidateId: string,
  input: SuggestionDecisionInput,
): Promise<{ decision: DecisionEntity | null }> {
  const customer = await getAccessibleCustomer(store, user, customerId);
  const candidate = await getCandidateForCustomer(store, customer, candidateId);
  const id = `${customerId}__${candidateId}`;
  const name = fullName(candidate);

  if (input.decision === 'none') {
    const existed = await store.decisions.delete(id);
    if (existed) {
      await logActivity(store, {
        type: 'suggestion_restored',
        actorId: user.id,
        customerId,
        message: `Restored ${name} to suggestions`,
        meta: { candidateId },
      });
    }
    return { decision: null };
  }

  const decision = await store.decisions.upsert({
    id,
    customerId,
    candidateId,
    decision: input.decision,
    reason: input.reason?.trim() || null,
    decidedById: user.id,
    decidedAt: nowIso(),
  });
  await logActivity(store, {
    type: input.decision === 'shortlisted' ? 'suggestion_shortlisted' : 'suggestion_dismissed',
    actorId: user.id,
    customerId,
    message:
      input.decision === 'shortlisted'
        ? `Shortlisted ${name}`
        : `Dismissed ${name} as not a fit${decision.reason ? `: "${decision.reason}"` : ''}`,
    meta: { candidateId },
  });
  return { decision };
}
