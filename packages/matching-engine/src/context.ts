import type {
  CategoryKey,
  CheckDirection,
  CheckOutcome,
  CheckResult,
  PreferenceSource,
  Profile,
  RelativePreference,
} from '@tdc/shared';
import { computeAge } from '@tdc/shared';
import type { MatchingConfig, RelationField } from './config';

/** One side of a comparison. */
export interface Side {
  person: Profile;
  age: number | null;
  name: string;
  isCustomer: boolean;
}

export interface PairContext {
  customer: Side;
  candidate: Side;
  config: MatchingConfig;
}

export interface Direction {
  /** The person whose preference is being checked. */
  seeker: Side;
  /** The person being evaluated against that preference. */
  other: Side;
  direction: Extract<CheckDirection, 'forward' | 'reverse'>;
}

export function buildPair(
  customer: Profile,
  candidate: Profile,
  now: Date,
  config: MatchingConfig,
): PairContext {
  return {
    customer: {
      person: customer,
      age: computeAge(customer.dateOfBirth, now),
      name: customer.firstName,
      isCustomer: true,
    },
    candidate: {
      person: candidate,
      age: computeAge(candidate.dateOfBirth, now),
      name: candidate.firstName,
      isCustomer: false,
    },
    config,
  };
}

/** Both directions: customer → candidate (forward) and candidate → customer (reverse). */
export function directions(pair: PairContext): Direction[] {
  return [
    { seeker: pair.customer, other: pair.candidate, direction: 'forward' },
    { seeker: pair.candidate, other: pair.customer, direction: 'reverse' },
  ];
}

export interface CheckSpec {
  category: CategoryKey;
  id: string;
  label: string;
  direction: CheckDirection;
  weight: number;
  source?: PreferenceSource;
}

export function makeCheck(
  spec: CheckSpec,
  outcome: CheckOutcome,
  score: number | null,
  detail: string,
): CheckResult {
  return {
    id: `${spec.category}.${spec.id}${spec.direction === 'mutual' ? '' : `.${spec.direction}`}`,
    category: spec.category,
    label: spec.label,
    direction: spec.direction,
    outcome,
    score: outcome === 'unknown' ? null : score,
    weight: spec.weight,
    source: spec.source ?? 'stated',
    detail,
  };
}

/** Maps a 0..1 score to an outcome using shared thresholds. */
export function outcomeFor(score: number): CheckOutcome {
  if (score >= 0.85) return 'match';
  if (score >= 0.3) return 'partial';
  return 'conflict';
}

export interface ResolvedRelation {
  value: RelativePreference;
  source: PreferenceSource;
}

/**
 * Resolves a relative preference for a person:
 *   1. An explicitly stated value always wins (including "no_preference").
 *   2. Otherwise, if this person is the customer and assignment rules are enabled,
 *      the configured default for their gender applies and is labelled `default_rule`.
 *   3. Otherwise there is no preference and the check is skipped.
 */
export function resolveRelation(
  side: Side,
  field: RelationField,
  config: MatchingConfig,
): ResolvedRelation | null {
  const stated = side.person.preferences[field];
  if (stated != null) return { value: stated, source: 'stated' };
  if (!side.isCustomer || !config.assignmentRules.enabled || !side.person.gender) return null;
  const fallback = config.assignmentRules.relationDefaults[side.person.gender]?.[field];
  return fallback ? { value: fallback, source: 'default_rule' } : null;
}
