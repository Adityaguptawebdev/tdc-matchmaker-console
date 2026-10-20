import type { DealBreaker, EligibilityResult, ExclusionReason, Profile } from '@tdc/shared';
import { DEAL_BREAKER_LABELS, computeAge } from '@tdc/shared';
import type { MatchingConfig } from './config';
import { distanceOutside, formatRange, normalizeCity, normalizeText } from './utils';

/** A prior interaction between the customer and a candidate (either direction of the pair). */
export interface PairHistoryEntry {
  candidateId: string;
  kind: 'sent' | 'rejected' | 'dismissed';
}

export interface EligibilityContext {
  now: Date;
  config: MatchingConfig;
  history?: readonly PairHistoryEntry[];
}

type DealBreakerOutcome = { status: 'violated' | 'ok' | 'unknown'; detail: string };

/**
 * Evaluates one structured deal-breaker held by `holder` against `other`.
 * Missing data yields 'unknown' — never a silent exclusion — and is surfaced as a warning.
 */
export function evaluateDealBreaker(
  dealBreaker: DealBreaker,
  holder: Profile,
  other: Profile,
  now: Date,
): DealBreakerOutcome {
  const label = DEAL_BREAKER_LABELS[dealBreaker];
  const unknown = (what: string): DealBreakerOutcome => ({
    status: 'unknown',
    detail: `${holder.firstName}'s deal-breaker "${label}" could not be verified: ${what}.`,
  });
  const violated = (detail: string): DealBreakerOutcome => ({ status: 'violated', detail });
  const ok: DealBreakerOutcome = { status: 'ok', detail: '' };

  switch (dealBreaker) {
    case 'smoker': {
      const s = other.lifestyle.smoking;
      if (!s) return unknown(`${other.firstName}'s smoking habits are not recorded`);
      return s === 'never'
        ? ok
        : violated(`${other.firstName} smokes ${s}; ${holder.firstName} will not consider a smoker.`);
    }
    case 'drinks_regularly': {
      const d = other.lifestyle.drinking;
      if (!d) return unknown(`${other.firstName}'s drinking habits are not recorded`);
      return d === 'regularly'
        ? violated(`${other.firstName} drinks regularly; this is a deal-breaker for ${holder.firstName}.`)
        : ok;
    }
    case 'non_vegetarian': {
      const diet = other.lifestyle.diet;
      if (!diet) return unknown(`${other.firstName}'s diet is not recorded`);
      return diet === 'non_vegetarian'
        ? violated(`${other.firstName} is non-vegetarian; ${holder.firstName} requires a vegetarian partner.`)
        : ok;
    }
    case 'age_outside_range': {
      const range = holder.preferences.ageRange;
      const age = computeAge(other.dateOfBirth, now);
      if (!range) return unknown(`${holder.firstName} has not set an age range`);
      if (age === null) return unknown(`${other.firstName}'s age is unknown`);
      return distanceOutside(age, range) > 0
        ? violated(
            `${other.firstName} (${age}) is outside ${holder.firstName}'s strict age range ${formatRange(range)}.`,
          )
        : ok;
    }
    case 'height_outside_range': {
      const range = holder.preferences.heightRangeCm;
      if (!range) return unknown(`${holder.firstName} has not set a height range`);
      if (other.heightCm == null) return unknown(`${other.firstName}'s height is not recorded`);
      return distanceOutside(other.heightCm, range) > 0
        ? violated(
            `${other.firstName} (${other.heightCm} cm) is outside ${holder.firstName}'s strict height range ${formatRange(range, ' cm')}.`,
          )
        : ok;
    }
    case 'children_mismatch': {
      const a = holder.preferences.wantsChildren;
      const b = other.preferences.wantsChildren;
      if (!a || !b) return unknown('views on children are not stated by both');
      return (a === 'yes' && b === 'no') || (a === 'no' && b === 'yes')
        ? violated(
            `${holder.firstName} ${a === 'yes' ? 'wants' : 'does not want'} children; ${other.firstName} ${b === 'yes' ? 'does' : 'does not'}.`,
          )
        : ok;
    }
    case 'unwilling_to_relocate': {
      const ca = normalizeCity(holder.city);
      const cb = normalizeCity(other.city);
      if (!ca || !cb) return unknown('city not recorded for both');
      if (ca === cb) return ok;
      const reloc = other.preferences.openToRelocation;
      if (!reloc) return unknown(`${other.firstName}'s openness to relocation is not stated`);
      return reloc === 'no'
        ? violated(
            `${other.firstName} lives in ${other.city} and will not relocate; ${holder.firstName} requires a partner willing to move.`,
          )
        : ok;
    }
    case 'previously_married': {
      const m = other.background.maritalStatus;
      if (!m) return unknown(`${other.firstName}'s marital status is not recorded`);
      return m === 'never_married'
        ? ok
        : violated(
            `${other.firstName} was previously married; ${holder.firstName} prefers a never-married partner.`,
          );
    }
    case 'different_religion': {
      const ra = holder.background.religion;
      const rb = other.background.religion;
      if (!ra || !rb) return unknown('religion was not shared by both');
      return normalizeText(ra) === normalizeText(rb)
        ? ok
        : violated(
            `${holder.firstName} requires a partner of the same religion; ${other.firstName}'s stated religion differs.`,
          );
    }
    case 'unverified_profile':
      return other.verification.status === 'verified'
        ? ok
        : violated(
            `${other.firstName}'s profile is ${other.verification.status}; ${holder.firstName} only wants verified profiles.`,
          );
    default: {
      const exhaustive: never = dealBreaker;
      return unknown(`unsupported deal-breaker ${String(exhaustive)}`);
    }
  }
}

/**
 * Hard eligibility rules. Order matters only for readability; all applicable reasons are collected
 * so matchmakers can see every reason a profile was excluded.
 */
export function checkEligibility(
  customer: Profile,
  candidate: Profile,
  ctx: EligibilityContext,
): EligibilityResult {
  const { config, now } = ctx;
  const reasons: EligibilityResult['reasons'] = [];
  const warnings: string[] = [];
  const add = (code: ExclusionReason, detail: string) => reasons.push({ code, detail });

  if (customer.id === candidate.id) {
    add('SAME_PROFILE', 'Candidate is the same profile as the customer.');
    return { eligible: false, reasons, warnings };
  }

  if (candidate.status !== 'active')
    add('INACTIVE_PROFILE', `${candidate.firstName}'s profile is ${candidate.status}.`);

  if (config.genderRule === 'opposite') {
    if (!customer.gender || !candidate.gender) {
      add(
        'GENDER_UNKNOWN',
        'Gender is not recorded, so the configured opposite-gender rule cannot be applied. Review the profile.',
      );
    } else if (customer.gender === candidate.gender) {
      add('GENDER_RULE', 'Same gender as the customer under the configured opposite-gender rule.');
    }
  }

  const age = computeAge(candidate.dateOfBirth, now);
  if (age === null) {
    add(
      'MISSING_DATE_OF_BIRTH',
      'Date of birth is missing or invalid, so legal minimum age cannot be verified.',
    );
  } else if (candidate.gender && age < config.minimumAge[candidate.gender]) {
    add('BELOW_MINIMUM_AGE', `${candidate.firstName} (${age}) is below the minimum eligible age.`);
  }

  for (const entry of ctx.history ?? []) {
    if (entry.candidateId !== candidate.id) continue;
    if (entry.kind === 'sent' && config.exclusionPolicy.excludeAlreadySent) {
      add('ALREADY_SENT', 'This pair has already been introduced; see match history.');
    } else if (entry.kind === 'rejected' && config.exclusionPolicy.excludeRejected) {
      add('PREVIOUSLY_REJECTED', 'This pair was previously rejected.');
    } else if (entry.kind === 'dismissed' && config.exclusionPolicy.excludeDismissed) {
      add('DISMISSED_BY_MATCHMAKER', 'A matchmaker marked this suggestion as not a fit.');
    }
  }

  // Deal-breakers apply in both directions: the customer's AND the candidate's.
  for (const [holder, other, code] of [
    [customer, candidate, 'CUSTOMER_DEAL_BREAKER'],
    [candidate, customer, 'CANDIDATE_DEAL_BREAKER'],
  ] as const) {
    for (const db of holder.preferences.dealBreakers) {
      const outcome = evaluateDealBreaker(db, holder, other, now);
      if (outcome.status === 'violated') add(code, outcome.detail);
      else if (outcome.status === 'unknown') warnings.push(outcome.detail);
    }
  }

  // De-duplicate identical reason codes from multiple history rows.
  const unique = reasons.filter(
    (r, i) => reasons.findIndex((x) => x.code === r.code && x.detail === r.detail) === i,
  );
  return { eligible: unique.length === 0, reasons: unique, warnings };
}
