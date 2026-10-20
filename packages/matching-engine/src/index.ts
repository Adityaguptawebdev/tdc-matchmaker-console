/**
 * @tdc/matching-engine — deterministic, explainable compatibility scoring.
 *
 * Pure functions only: no I/O, no clocks (callers pass `now`), no randomness, no framework code.
 * See MATCHING_ALGORITHM.md at the repository root for the full design.
 */
export { DEFAULT_CONFIG, DEFAULT_WEIGHTS, createConfig, validateConfig } from './config';
export type { CategoryWeights, MatchingConfig, RelationField } from './config';
export { checkEligibility, evaluateDealBreaker } from './eligibility';
export type { EligibilityContext, PairHistoryEntry } from './eligibility';
export { bandFor, confidenceFor, evaluateChecks, scoreCompatibility, selectWeightProfile } from './scoring';
export type { ScoreOptions } from './scoring';
export { generateExplanation } from './explanation';
export { compareRanked, rankCandidates } from './ranking';
export type { ExcludedCandidate, RankOptions, RankedCandidate, RankingResult } from './ranking';
export { buildPair, resolveRelation } from './context';
export { formatMoney, normalizeCity, toINR } from './utils';
