import type {
  CategoryBreakdown,
  CategoryKey,
  CheckResult,
  ConfidenceLevel,
  MatchBreakdown,
  Profile,
  ScoreBand,
} from '@tdc/shared';
import { CATEGORY_KEYS, CATEGORY_LABELS, SCORE_BAND_LABELS } from '@tdc/shared';
import { ageChecks } from './categories/age';
import { careerChecks } from './categories/career';
import { languageChecks } from './categories/language';
import { lifestyleChecks } from './categories/lifestyle';
import { locationChecks } from './categories/location';
import { otherChecks } from './categories/other';
import { relationshipChecks } from './categories/relationship';
import type { CategoryWeights, MatchingConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { buildPair, type PairContext } from './context';
import { generateExplanation } from './explanation';
import { clamp, evidenceOf, rawScoreOf, round, shrinkToNeutral } from './utils';

const EVALUATORS: Record<CategoryKey, (pair: PairContext) => CheckResult[]> = {
  relationshipGoals: relationshipChecks,
  age: ageChecks,
  careerEducation: careerChecks,
  location: locationChecks,
  lifestyleValues: lifestyleChecks,
  languageInterests: languageChecks,
  otherPreferences: otherChecks,
};

export interface ScoreOptions {
  now: Date;
  config?: MatchingConfig;
  /** Non-blocking eligibility warnings to carry into the breakdown. */
  warnings?: string[];
}

export function selectWeightProfile(
  customer: Profile,
  config: MatchingConfig,
): { name: string; weights: CategoryWeights } {
  if (config.assignmentRules.enabled && customer.gender === 'male') {
    return { name: 'male_customer', weights: config.weightProfiles.male_customer };
  }
  if (config.assignmentRules.enabled && customer.gender === 'female') {
    return { name: 'female_customer', weights: config.weightProfiles.female_customer };
  }
  return { name: 'default', weights: config.weightProfiles.default };
}

/** Runs all category evaluators for a customer/candidate pair. */
export function evaluateChecks(pair: PairContext): Record<CategoryKey, CheckResult[]> {
  const out = {} as Record<CategoryKey, CheckResult[]>;
  for (const key of CATEGORY_KEYS) out[key] = EVALUATORS[key](pair);
  return out;
}

interface CategoryInternal extends CategoryBreakdown {
  nominalWeight: number;
  forwardScore: number | null;
  reverseScore: number | null;
}

function aggregateCategory(key: CategoryKey, checks: CheckResult[], nominalWeight: number): CategoryInternal {
  const rawScore = rawScoreOf(checks);
  const evidence = evidenceOf(checks);
  const directional = (dir: 'forward' | 'reverse'): number | null => {
    const subset = checks.filter((c) => c.direction === dir || c.direction === 'mutual');
    return subset.length === 0 ? null : shrinkToNeutral(rawScoreOf(subset), evidenceOf(subset));
  };
  return {
    key,
    label: CATEGORY_LABELS[key],
    weight: 0,
    nominalWeight,
    rawScore: rawScore === null ? null : round(rawScore, 1),
    score: round(shrinkToNeutral(rawScore, evidence), 1),
    evidence: round(evidence, 3),
    checks,
    forwardScore: directional('forward'),
    reverseScore: directional('reverse'),
  };
}

/** Weighted mean over categories that have a value, renormalising the weights among them. */
function weightedMean(items: { weight: number; value: number | null }[]): number {
  let w = 0;
  let s = 0;
  for (const it of items) {
    if (it.value === null || it.weight <= 0) continue;
    w += it.weight;
    s += it.value * it.weight;
  }
  return w === 0 ? 50 : s / w;
}

export function bandFor(score: number, config: MatchingConfig): ScoreBand {
  for (const b of config.bands) if (score >= b.min) return b.band;
  return 'low';
}

export function confidenceFor(evidence: number, config: MatchingConfig): ConfidenceLevel {
  if (evidence >= config.confidenceThresholds.high) return 'high';
  if (evidence >= config.confidenceThresholds.medium) return 'medium';
  return 'low';
}

const BAND_ORDER: ScoreBand[] = ['low', 'explore', 'good', 'high'];

/**
 * Scores a customer/candidate pair on a 0–100 scale.
 *
 *  1. Each category produces checks (forward, reverse, mutual) scored 0..1, or unknown.
 *  2. Category score = weighted mean of known checks, shrunk toward 50 by missing evidence.
 *  3. Categories with no applicable checks are dropped and their weight redistributed.
 *  4. Weighted score = Σ(weight × category score) / Σ(weight).
 *  5. Mutuality cap: final ≤ min(fit for customer, fit for candidate) + mutualityGap.
 *  6. Band from score, then limited by a confidence-based ceiling.
 */
export function scoreCompatibility(
  customer: Profile,
  candidate: Profile,
  options: ScoreOptions,
): MatchBreakdown {
  const config = options.config ?? DEFAULT_CONFIG;
  const pair = buildPair(customer, candidate, options.now, config);
  const profile = selectWeightProfile(customer, config);
  const byCategory = evaluateChecks(pair);

  const internals = CATEGORY_KEYS.map((key) => aggregateCategory(key, byCategory[key], profile.weights[key]));
  const applicable = internals.filter((c) => c.checks.length > 0);
  const totalNominal = applicable.reduce((a, c) => a + c.nominalWeight, 0) || 1;
  for (const c of internals)
    c.weight = c.checks.length > 0 ? round((c.nominalWeight / totalNominal) * 100, 1) : 0;

  const weightedScore = weightedMean(applicable.map((c) => ({ weight: c.nominalWeight, value: c.score })));
  const forCustomer = weightedMean(
    applicable.map((c) => ({ weight: c.nominalWeight, value: c.forwardScore })),
  );
  const forCandidate = weightedMean(
    applicable.map((c) => ({ weight: c.nominalWeight, value: c.reverseScore })),
  );
  const ceiling = Math.min(forCustomer, forCandidate) + config.mutualityGap;
  const capApplied = weightedScore > ceiling;
  const score = Math.round(clamp(capApplied ? ceiling : weightedScore, 0, 100));

  const evidence = weightedMean(applicable.map((c) => ({ weight: c.nominalWeight, value: c.evidence })));
  const confidence = confidenceFor(evidence, config);
  const rawBand = bandFor(score, config);
  const maxBand = config.bandCeilingByConfidence[confidence];
  const band = BAND_ORDER.indexOf(rawBand) > BAND_ORDER.indexOf(maxBand) ? maxBand : rawBand;

  const allChecks = internals.flatMap((c) => c.checks);
  const conflicts = allChecks.filter((c) => c.outcome === 'conflict').map((c) => c.detail);
  const warnings = [...(options.warnings ?? [])];
  if (capApplied) {
    const weaker = forCandidate < forCustomer ? candidate.firstName : customer.firstName;
    warnings.push(
      `Score limited to ${score} by the mutuality rule: ${weaker}'s stated preferences are less well met (${Math.round(Math.min(forCustomer, forCandidate))}/100).`,
    );
  }
  if (band !== rawBand) {
    warnings.push(
      `Label lowered from "${SCORE_BAND_LABELS[rawBand]}" because only ${Math.round(evidence * 100)}% of the compatibility checks had data on both sides.`,
    );
  }

  const categories: CategoryBreakdown[] = internals.map(
    ({ nominalWeight: _n, forwardScore: _f, reverseScore: _r, ...rest }) => rest,
  );

  const breakdown: MatchBreakdown = {
    customerId: customer.id,
    candidateId: candidate.id,
    score,
    weightedScore: round(weightedScore, 1),
    band,
    bandLabel: SCORE_BAND_LABELS[band],
    confidence,
    evidence: round(evidence, 3),
    directional: { forCustomer: Math.round(forCustomer), forCandidate: Math.round(forCandidate), capApplied },
    categories,
    conflicts,
    warnings,
    explanation: { headline: '', strengths: [], considerations: [], unknowns: [], assumptions: [] },
    weightProfile: profile.name,
    engineVersion: config.engineVersion,
  };
  breakdown.explanation = generateExplanation(breakdown, customer, candidate, config);
  return breakdown;
}
