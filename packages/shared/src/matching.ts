/**
 * Result types produced by @tdc/matching-engine and returned by the API.
 * Kept here so the web app can consume them without depending on the engine.
 */

export const CATEGORY_KEYS = [
  'relationshipGoals',
  'age',
  'careerEducation',
  'location',
  'lifestyleValues',
  'languageInterests',
  'otherPreferences',
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  relationshipGoals: 'Relationship goals & children',
  age: 'Age preferences',
  careerEducation: 'Career & education',
  location: 'Location & relocation',
  lifestyleValues: 'Lifestyle & values',
  languageInterests: 'Language & interests',
  otherPreferences: 'Other stated preferences',
};

/**
 * Direction of a check:
 *  - `forward`  — does the candidate satisfy the customer's stated preference?
 *  - `reverse`  — does the customer satisfy the candidate's stated preference?
 *  - `mutual`   — a symmetric comparison of both people (e.g. shared language).
 */
export type CheckDirection = 'forward' | 'reverse' | 'mutual';
export type CheckOutcome = 'match' | 'partial' | 'conflict' | 'unknown';
/** Where the preference came from: stated by the person, an assignment default rule, or derived from profile facts. */
export type PreferenceSource = 'stated' | 'default_rule' | 'derived';

export interface CheckResult {
  id: string;
  category: CategoryKey;
  label: string;
  direction: CheckDirection;
  outcome: CheckOutcome;
  /** 0..1, or null when unknown. */
  score: number | null;
  /** Relative weight of this check within its category. */
  weight: number;
  source: PreferenceSource;
  /** Human-readable, fact-based explanation built only from profile data. */
  detail: string;
}

export interface CategoryBreakdown {
  key: CategoryKey;
  label: string;
  /** Effective weight of the category in the final score (weights sum to 100). */
  weight: number;
  /** Raw weighted mean of known checks, 0..100 (null when no check had data). */
  rawScore: number | null;
  /** Evidence-adjusted score used in the final calculation, 0..100. */
  score: number;
  /** Fraction (0..1) of the category's check weight that had data on both sides. */
  evidence: number;
  checks: CheckResult[];
}

export type ScoreBand = 'high' | 'good' | 'explore' | 'low';
export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  high: 'High Potential',
  good: 'Good Potential',
  explore: 'Explore Further',
  low: 'Low Compatibility',
};

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Limited data',
};

export interface DirectionalFit {
  /** How well the candidate meets the customer's stated preferences (0..100). */
  forCustomer: number;
  /** How well the customer meets the candidate's stated preferences (0..100). */
  forCandidate: number;
  /** True when the mutuality cap reduced the score. */
  capApplied: boolean;
}

export interface MatchExplanation {
  headline: string;
  strengths: string[];
  considerations: string[];
  unknowns: string[];
  assumptions: string[];
}

export interface MatchBreakdown {
  customerId: string;
  candidateId: string;
  /** Final 0..100 compatibility score (integer). Not a probability of relationship success. */
  score: number;
  /** Score before the mutuality cap was applied. */
  weightedScore: number;
  band: ScoreBand;
  bandLabel: string;
  confidence: ConfidenceLevel;
  /** Overall evidence 0..1. */
  evidence: number;
  directional: DirectionalFit;
  categories: CategoryBreakdown[];
  conflicts: string[];
  warnings: string[];
  explanation: MatchExplanation;
  /** Which weight profile was applied (e.g. 'default', 'male_customer', 'female_customer'). */
  weightProfile: string;
  engineVersion: string;
}

export type ExclusionReason =
  | 'SAME_PROFILE'
  | 'DUPLICATE_CANDIDATE'
  | 'GENDER_RULE'
  | 'GENDER_UNKNOWN'
  | 'INACTIVE_PROFILE'
  | 'BELOW_MINIMUM_AGE'
  | 'MISSING_DATE_OF_BIRTH'
  | 'CUSTOMER_DEAL_BREAKER'
  | 'CANDIDATE_DEAL_BREAKER'
  | 'ALREADY_SENT'
  | 'PREVIOUSLY_REJECTED'
  | 'DISMISSED_BY_MATCHMAKER';

export const EXCLUSION_REASON_LABELS: Record<ExclusionReason, string> = {
  SAME_PROFILE: 'Same profile as customer',
  DUPLICATE_CANDIDATE: 'Duplicate profile in pool',
  GENDER_RULE: 'Does not meet gender matching rule',
  GENDER_UNKNOWN: 'Gender not recorded (needs review)',
  INACTIVE_PROFILE: 'Profile paused or engaged',
  BELOW_MINIMUM_AGE: 'Below minimum eligible age',
  MISSING_DATE_OF_BIRTH: 'Date of birth missing (age cannot be verified)',
  CUSTOMER_DEAL_BREAKER: "Customer's deal-breaker",
  CANDIDATE_DEAL_BREAKER: "Candidate's deal-breaker",
  ALREADY_SENT: 'Already introduced',
  PREVIOUSLY_REJECTED: 'Previously rejected',
  DISMISSED_BY_MATCHMAKER: 'Dismissed by matchmaker',
};

export interface EligibilityResult {
  eligible: boolean;
  reasons: { code: ExclusionReason; detail: string }[];
  /** Non-blocking issues (e.g. a deal-breaker that cannot be verified because data is missing). */
  warnings: string[];
}

export interface RankingSummary {
  evaluated: number;
  eligible: number;
  recommended: number;
  belowThreshold: number;
  excludedByReason: Partial<Record<ExclusionReason, number>>;
  minScore: number;
}
