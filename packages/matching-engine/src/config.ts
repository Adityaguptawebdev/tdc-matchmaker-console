import type { CategoryKey, Currency, Gender, RelativePreference, ScoreBand } from '@tdc/shared';

export type CategoryWeights = Record<CategoryKey, number>;

/** Relative-preference fields that assignment default rules may fill in when a customer has not stated them. */
export type RelationField = 'partnerAgeRelation' | 'partnerIncomeRelation' | 'partnerHeightRelation';

export interface MatchingConfig {
  engineVersion: string;
  /** 'opposite' — candidate gender must differ from the customer's. 'any' — no gender rule. */
  genderRule: 'opposite' | 'any';
  /** Legal minimum marriage age in India (Prohibition of Child Marriage Act, 2006). */
  minimumAge: Record<Gender, number>;
  /** Candidates must reach this score (0..100) to be recommended. */
  minRecommendScore: number;
  /** Score bands, evaluated top-down. */
  bands: { band: ScoreBand; min: number }[];
  /** Evidence thresholds (0..1) for confidence levels. */
  confidenceThresholds: { high: number; medium: number };
  /** Highest band allowed for each confidence level — prevents a confident label on thin data. */
  bandCeilingByConfidence: Record<'high' | 'medium' | 'low', ScoreBand>;
  /**
   * Mutuality cap: the final score may exceed the weaker directional fit by at most this many points,
   * so a candidate whose own preferences are poorly met cannot receive a high "mutual" score.
   */
  mutualityGap: number;
  /** Soft tolerance before a range preference counts as a conflict. */
  softMargins: { ageYears: number; heightCm: number };
  /** Category weight profiles. Each must sum to 100. */
  weightProfiles: {
    default: CategoryWeights;
    male_customer: CategoryWeights;
    female_customer: CategoryWeights;
  };
  /**
   * Assignment-specific business rules. When enabled:
   *  - the customer's gender selects a weight profile, and
   *  - `relationDefaults` are applied ONLY to the customer being served, ONLY when they have not stated
   *    that preference themselves. Any explicit statement (including "no_preference") overrides them.
   */
  assignmentRules: {
    enabled: boolean;
    relationDefaults: Record<Gender, Partial<Record<RelationField, RelativePreference>>>;
  };
  /** Which history entries exclude a candidate from new recommendations. */
  exclusionPolicy: { excludeAlreadySent: boolean; excludeRejected: boolean; excludeDismissed: boolean };
  /** Approximate static FX rates used only to compare incomes across currencies. */
  fxToINR: Record<Currency, number>;
}

export const DEFAULT_WEIGHTS: CategoryWeights = {
  relationshipGoals: 25,
  age: 15,
  careerEducation: 15,
  location: 15,
  lifestyleValues: 15,
  languageInterests: 10,
  otherPreferences: 5,
};

export const DEFAULT_CONFIG: MatchingConfig = {
  engineVersion: '1.0.0',
  genderRule: 'opposite',
  minimumAge: { male: 21, female: 18 },
  minRecommendScore: 50,
  bands: [
    { band: 'high', min: 80 },
    { band: 'good', min: 65 },
    { band: 'explore', min: 50 },
    { band: 'low', min: 0 },
  ],
  confidenceThresholds: { high: 0.75, medium: 0.5 },
  bandCeilingByConfidence: { high: 'high', medium: 'good', low: 'explore' },
  mutualityGap: 15,
  softMargins: { ageYears: 2, heightCm: 3 },
  weightProfiles: {
    default: DEFAULT_WEIGHTS,
    // Male customers: the default weights. The assignment's age/income/height considerations are applied
    // as explicit, labelled relation checks (see relationDefaults) and children views carry 25%.
    male_customer: DEFAULT_WEIGHTS,
    // Female customers: the assignment asks us to weigh profession, values and relocation more heavily.
    female_customer: {
      relationshipGoals: 22,
      age: 10,
      careerEducation: 18,
      location: 17,
      lifestyleValues: 18,
      languageInterests: 10,
      otherPreferences: 5,
    },
  },
  assignmentRules: {
    enabled: true,
    relationDefaults: {
      male: { partnerAgeRelation: 'lower', partnerIncomeRelation: 'lower', partnerHeightRelation: 'lower' },
      female: {},
    },
  },
  exclusionPolicy: { excludeAlreadySent: true, excludeRejected: true, excludeDismissed: true },
  fxToINR: { INR: 1, USD: 84, GBP: 107, SGD: 63, AED: 23 },
};

/** Creates a config from defaults with a shallow-per-section override (useful for tests and env toggles). */
export function createConfig(overrides: Partial<MatchingConfig> = {}): MatchingConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    assignmentRules: { ...DEFAULT_CONFIG.assignmentRules, ...overrides.assignmentRules },
    exclusionPolicy: { ...DEFAULT_CONFIG.exclusionPolicy, ...overrides.exclusionPolicy },
    weightProfiles: { ...DEFAULT_CONFIG.weightProfiles, ...overrides.weightProfiles },
  };
}

export function validateConfig(config: MatchingConfig): string[] {
  const errors: string[] = [];
  for (const [name, weights] of Object.entries(config.weightProfiles)) {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.001) errors.push(`Weight profile "${name}" sums to ${sum}, expected 100`);
  }
  if (config.minRecommendScore < 0 || config.minRecommendScore > 100)
    errors.push('minRecommendScore out of range');
  return errors;
}
