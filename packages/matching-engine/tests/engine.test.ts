import { describe, expect, it } from 'vitest';
import type { MatchBreakdown, Profile } from '@tdc/shared';
import {
  DEFAULT_CONFIG,
  checkEligibility,
  createConfig,
  rankCandidates,
  scoreCompatibility,
  validateConfig,
} from '../src';
import { NOW, femaleCandidate, makeProfile, maleCustomer } from './fixtures';

const ctx = { now: NOW, config: DEFAULT_CONFIG };
const allChecks = (b: MatchBreakdown) => b.categories.flatMap((c) => c.checks);
const findCheck = (b: MatchBreakdown, id: string) => allChecks(b).find((c) => c.id === id);
const reasonCodes = (customer: Profile, candidate: Profile, history = ctx) =>
  checkEligibility(customer, candidate, history).reasons.map((r) => r.code);

/** Small deterministic PRNG so the property-style test is reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('configuration', () => {
  it('ships weight profiles that each sum to 100', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual([]);
  });
});

describe('eligibility', () => {
  it('excludes the same profile', () => {
    const c = maleCustomer();
    expect(reasonCodes(c, c)).toEqual(['SAME_PROFILE']);
  });

  it('excludes same-gender candidates under the opposite-gender rule', () => {
    const c = maleCustomer();
    const sameGender = makeProfile({ id: 'm2', gender: 'male' });
    expect(reasonCodes(c, sameGender)).toContain('GENDER_RULE');
  });

  it('allows same-gender candidates when the gender rule is configured as "any"', () => {
    const c = maleCustomer();
    const sameGender = makeProfile({
      id: 'm2',
      gender: 'male',
      preferences: { ageRange: { min: 25, max: 40 } },
    });
    const res = checkEligibility(c, sameGender, { now: NOW, config: createConfig({ genderRule: 'any' }) });
    expect(res.reasons.map((r) => r.code)).not.toContain('GENDER_RULE');
  });

  it('marks missing gender transparently instead of silently dropping the profile', () => {
    const res = checkEligibility(maleCustomer(), femaleCandidate('f1', { gender: null }), ctx);
    expect(res.eligible).toBe(false);
    expect(res.reasons[0]?.code).toBe('GENDER_UNKNOWN');
    expect(res.reasons[0]?.detail).toMatch(/Review the profile/);
  });

  it('respects an age deal-breaker strictly, but treats an age range alone as a soft preference', () => {
    const tooOld = femaleCandidate('f1', { dateOfBirth: '1990-01-01' }); // 36, customer range 25–32
    const soft = checkEligibility(maleCustomer(), tooOld, ctx);
    expect(soft.eligible).toBe(true);

    const strictCustomer = maleCustomer({
      preferences: { ageRange: { min: 25, max: 32 }, dealBreakers: ['age_outside_range'] },
    });
    const strict = checkEligibility(strictCustomer, tooOld, ctx);
    expect(strict.eligible).toBe(false);
    expect(strict.reasons[0]?.code).toBe('CUSTOMER_DEAL_BREAKER');
    expect(strict.reasons[0]?.detail).toContain('36');
  });

  it("applies the candidate's deal-breakers too (both directions matter)", () => {
    const smoker = maleCustomer({ lifestyle: { smoking: 'occasionally' } });
    const candidate = femaleCandidate('f1', { preferences: { dealBreakers: ['smoker'] } });
    expect(reasonCodes(smoker, candidate)).toContain('CANDIDATE_DEAL_BREAKER');
  });

  it('turns an unverifiable deal-breaker into a warning rather than an exclusion', () => {
    const customer = maleCustomer({ preferences: { dealBreakers: ['smoker'] } });
    const unknownHabits = femaleCandidate('f1', { lifestyle: { smoking: null } });
    const res = checkEligibility(customer, unknownHabits, ctx);
    expect(res.eligible).toBe(true);
    expect(res.warnings[0]).toMatch(/could not be verified/);
  });

  it('enforces the legal minimum age and requires a date of birth', () => {
    const young = femaleCandidate('f1', { dateOfBirth: '2009-01-01' }); // 17
    expect(reasonCodes(maleCustomer(), young)).toContain('BELOW_MINIMUM_AGE');
    const noDob = femaleCandidate('f2', { dateOfBirth: null });
    expect(reasonCodes(maleCustomer(), noDob)).toContain('MISSING_DATE_OF_BIRTH');
  });

  it('excludes paused or engaged profiles', () => {
    expect(reasonCodes(maleCustomer(), femaleCandidate('f1', { status: 'engaged' }))).toContain(
      'INACTIVE_PROFILE',
    );
  });
});

describe('children preferences', () => {
  it('scores opposite definite views as an explicit conflict', () => {
    const b = scoreCompatibility(
      maleCustomer(),
      femaleCandidate('f1', { preferences: { wantsChildren: 'no' } }),
      ctx,
    );
    const check = findCheck(b, 'relationshipGoals.children');
    expect(check?.outcome).toBe('conflict');
    expect(check?.score).toBe(0);
    expect(b.conflicts).toContain('Arjun wants children; Kavya does not want children.');
  });

  it('excludes the pair when either person holds a children_mismatch deal-breaker', () => {
    const cand = femaleCandidate('f1', {
      preferences: { wantsChildren: 'no', dealBreakers: ['children_mismatch'] },
    });
    expect(reasonCodes(maleCustomer(), cand)).toContain('CANDIDATE_DEAL_BREAKER');
  });

  it('treats "maybe" as partial, not as a conflict', () => {
    const b = scoreCompatibility(
      maleCustomer(),
      femaleCandidate('f1', { preferences: { wantsChildren: 'maybe' } }),
      ctx,
    );
    expect(findCheck(b, 'relationshipGoals.children')?.outcome).toBe('partial');
  });

  it('ranks aligned children views above conflicting ones, all else equal', () => {
    const aligned = scoreCompatibility(maleCustomer(), femaleCandidate('f1'), ctx);
    const opposed = scoreCompatibility(
      maleCustomer(),
      femaleCandidate('f2', { preferences: { wantsChildren: 'no' } }),
      ctx,
    );
    expect(aligned.score).toBeGreaterThan(opposed.score);
  });
});

describe('relocation', () => {
  it('rewards a candidate in another city who is open to relocating', () => {
    const cand = femaleCandidate('f1', { city: 'Pune', preferences: { openToRelocation: 'yes' } });
    const b = scoreCompatibility(maleCustomer(), cand, ctx);
    expect(findCheck(b, 'location.relocation')?.outcome).toBe('match');
    expect(findCheck(b, 'location.preferred.forward')?.score).toBe(0.8);
  });

  it('flags a conflict when neither person will relocate between different cities', () => {
    const customer = maleCustomer({
      preferences: { openToRelocation: 'no', ageRange: { min: 25, max: 32 } },
    });
    const cand = femaleCandidate('f1', { city: 'Pune', preferences: { openToRelocation: 'no' } });
    const b = scoreCompatibility(customer, cand, ctx);
    expect(findCheck(b, 'location.relocation')?.outcome).toBe('conflict');
    expect(b.conflicts.some((c) => c.includes('neither wishes to relocate'))).toBe(true);
  });

  it('needs no relocation when both live in the same city (city aliases normalised)', () => {
    const cand = femaleCandidate('f1', { city: 'Bangalore' });
    expect(findCheck(scoreCompatibility(maleCustomer(), cand, ctx), 'location.relocation')?.outcome).toBe(
      'match',
    );
  });

  it('enforces the unwilling_to_relocate deal-breaker', () => {
    const customer = maleCustomer({
      preferences: { dealBreakers: ['unwilling_to_relocate'], ageRange: { min: 25, max: 32 } },
    });
    const cand = femaleCandidate('f1', { city: 'Delhi', preferences: { openToRelocation: 'no' } });
    expect(reasonCodes(customer, cand)).toContain('CUSTOMER_DEAL_BREAKER');
  });
});

describe('open preferences', () => {
  it('adds no check (and no evidence either way) when a preference is explicitly open', () => {
    const open = maleCustomer({
      preferences: {
        ageRange: { min: 25, max: 32 },
        locations: [],
        professions: [],
        diets: [],
        acceptsSmoking: 'yes',
      },
    });
    const b = scoreCompatibility(open, femaleCandidate('f1'), ctx);
    expect(findCheck(b, 'location.preferred.forward')).toBeUndefined();
    expect(findCheck(b, 'careerEducation.profession.forward')).toBeUndefined();
    expect(findCheck(b, 'lifestyleValues.diet.forward')).toBeUndefined();
    expect(findCheck(b, 'lifestyleValues.smoking.forward')).toBeUndefined();
    // The candidate's own stated preferences are still checked in reverse.
    expect(findCheck(b, 'location.preferred.reverse')).toBeDefined();
  });
});

describe('missing data', () => {
  const sparse = makeProfile({
    id: 'sparse',
    firstName: 'Nisha',
    gender: 'female',
    heightCm: null,
    city: null,
    education: { college: null, degree: null, level: null, field: null },
    career: {
      company: null,
      designation: null,
      profession: null,
      professionCategory: null,
      income: null,
      careerGoals: null,
      workLocation: null,
    },
    background: {
      maritalStatus: null,
      languages: [],
      familyValues: null,
      familyType: null,
      siblings: null,
      religion: null,
    },
    lifestyle: { diet: null, smoking: null, drinking: null, interests: [], pets: null },
    preferences: {
      wantsChildren: null,
      openToRelocation: null,
      openToPets: null,
      marriageTimeline: null,
      ageRange: null,
      locations: null,
      professions: null,
      diets: null,
      acceptsSmoking: null,
      acceptsDrinking: null,
      maritalStatuses: null,
      values: [],
      dealBreakers: [],
    },
  });

  it('does not crash and does not exclude solely for missing demographic fields', () => {
    const res = checkEligibility(maleCustomer(), sparse, ctx);
    expect(res.eligible).toBe(true);
    const b = scoreCompatibility(maleCustomer(), sparse, ctx);
    expect(Number.isFinite(b.score)).toBe(true);
  });

  it('records missing data as unknown, lowers confidence, and avoids a confident label', () => {
    const b = scoreCompatibility(maleCustomer(), sparse, ctx);
    expect(allChecks(b).filter((c) => c.outcome === 'unknown').length).toBeGreaterThan(5);
    expect(b.confidence).toBe('low');
    expect(['explore', 'low']).toContain(b.band);
    expect(b.explanation.unknowns.length).toBeGreaterThan(0);
  });

  it('pulls unknown categories to a neutral 50 rather than to 0', () => {
    const b = scoreCompatibility(maleCustomer(), sparse, ctx);
    const location = b.categories.find((c) => c.key === 'location');
    expect(location?.rawScore).toBeNull();
    expect(location?.score).toBe(50);
  });

  it('works when the customer is the sparse one', () => {
    const b = scoreCompatibility(
      { ...sparse, gender: 'female', kind: 'client' },
      makeProfile({ id: 'm1', gender: 'male' }),
      ctx,
    );
    expect(b.score).toBeGreaterThanOrEqual(0);
    expect(b.score).toBeLessThanOrEqual(100);
  });
});

describe('score bounds and determinism', () => {
  const rand = mulberry32(42);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
  const randomProfile = (id: string, gender: 'male' | 'female'): Profile =>
    makeProfile({
      id,
      gender,
      dateOfBirth: `${1984 + Math.floor(rand() * 16)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
      heightCm: 150 + Math.floor(rand() * 40),
      city: pick(['Mumbai', 'Delhi', 'Pune', 'Bengaluru', 'Jaipur', null]),
      career: {
        income:
          rand() < 0.2
            ? null
            : { amount: 500_000 + Math.floor(rand() * 5_000_000), currency: pick(['INR', 'USD'] as const) },
      },
      lifestyle: {
        smoking: pick(['never', 'occasionally', 'regularly', null] as const),
        diet: pick(['vegetarian', 'non_vegetarian', 'jain', null] as const),
      },
      preferences: {
        wantsChildren: pick(['yes', 'no', 'maybe', null] as const),
        openToRelocation: pick(['yes', 'no', 'maybe', null] as const),
        ageRange:
          rand() < 0.2 ? null : { min: 22 + Math.floor(rand() * 8), max: 30 + Math.floor(rand() * 10) },
        locations: rand() < 0.3 ? [] : [pick(['Mumbai', 'Delhi', 'Pune'])],
        partnerAgeRelation: pick(['lower', 'similar', 'higher', 'no_preference', null] as const),
        heightRangeCm: rand() < 0.5 ? null : { min: 150, max: 175 },
        diets: rand() < 0.5 ? [] : ['vegetarian'],
      },
    });

  const customers = Array.from({ length: 6 }, (_, i) => randomProfile(`c${i}`, i % 2 ? 'female' : 'male'));
  const pool = Array.from({ length: 80 }, (_, i) =>
    randomProfile(`p${String(i).padStart(3, '0')}`, i % 2 ? 'female' : 'male'),
  );

  it('keeps every overall and category score within 0–100', () => {
    for (const customer of customers) {
      for (const cand of pool) {
        if (cand.gender === customer.gender) continue;
        const b = scoreCompatibility(customer, cand, ctx);
        expect(b.score).toBeGreaterThanOrEqual(0);
        expect(b.score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(b.score)).toBe(true);
        for (const cat of b.categories) {
          expect(cat.score).toBeGreaterThanOrEqual(0);
          expect(cat.score).toBeLessThanOrEqual(100);
          expect(cat.evidence).toBeGreaterThanOrEqual(0);
          expect(cat.evidence).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('produces identical rankings for identical input, regardless of pool order', () => {
    const customer = customers[0]!;
    const first = rankCandidates(customer, pool, { now: NOW, minScore: 0 });
    const second = rankCandidates(customer, pool, { now: NOW, minScore: 0 });
    const shuffled = rankCandidates(customer, [...pool].reverse(), { now: NOW, minScore: 0 });
    const ids = (r: typeof first) => r.recommended.map((x) => `${x.candidate.id}:${x.breakdown.score}`);
    expect(ids(second)).toEqual(ids(first));
    expect(ids(shuffled)).toEqual(ids(first));
    expect(JSON.stringify(second.recommended[0]?.breakdown)).toBe(
      JSON.stringify(first.recommended[0]?.breakdown),
    );
  });

  it('sorts recommendations by score descending', () => {
    const r = rankCandidates(customers[1]!, pool, { now: NOW, minScore: 0 });
    const scores = r.recommended.map((x) => x.breakdown.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe('duplicate prevention', () => {
  const customer = maleCustomer();
  const pool = [femaleCandidate('f1'), femaleCandidate('f2'), femaleCandidate('f3')];

  it('excludes candidates who were already introduced, rejected or dismissed', () => {
    const r = rankCandidates(customer, pool, {
      now: NOW,
      history: [
        { candidateId: 'f1', kind: 'sent' },
        { candidateId: 'f2', kind: 'dismissed' },
      ],
    });
    expect(r.recommended.map((x) => x.candidate.id)).toEqual(['f3']);
    expect(r.summary.excludedByReason).toMatchObject({ ALREADY_SENT: 1, DISMISSED_BY_MATCHMAKER: 1 });
  });

  it('never returns the same candidate twice even if the pool contains duplicates', () => {
    const r = rankCandidates(customer, [...pool, femaleCandidate('f1')], { now: NOW });
    const ids = r.recommended.map((x) => x.candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.summary.excludedByReason.DUPLICATE_CANDIDATE).toBe(1);
  });

  it('honours the exclusion policy configuration', () => {
    const config = createConfig({
      exclusionPolicy: { excludeAlreadySent: false, excludeRejected: true, excludeDismissed: true },
    });
    const r = rankCandidates(customer, pool, {
      now: NOW,
      config,
      history: [{ candidateId: 'f1', kind: 'sent' }],
    });
    expect(r.recommended.map((x) => x.candidate.id)).toContain('f1');
  });
});

describe('male and female customers', () => {
  const men = Array.from({ length: 5 }, (_, i) =>
    makeProfile({
      id: `m${i}`,
      firstName: `M${i}`,
      gender: 'male',
      dateOfBirth: `${1992 + i}-02-02`,
      heightCm: 172 + i,
      preferences: { ageRange: { min: 24, max: 34 } },
    }),
  );
  const women = Array.from({ length: 5 }, (_, i) =>
    makeProfile({
      id: `w${i}`,
      firstName: `W${i}`,
      gender: 'female',
      dateOfBirth: `${1994 + i}-03-03`,
      heightCm: 158 + i,
      preferences: { ageRange: { min: 27, max: 36 } },
    }),
  );

  it('gives a male customer only female suggestions, using the male weight profile', () => {
    const customer = maleCustomer();
    const r = rankCandidates(customer, [...men, ...women], { now: NOW });
    expect(r.recommended.length).toBeGreaterThan(0);
    expect(r.recommended.every((x) => x.candidate.gender === 'female')).toBe(true);
    expect(r.recommended[0]?.breakdown.weightProfile).toBe('male_customer');
  });

  it('gives a female customer only male suggestions, using the female weight profile', () => {
    const customer = makeProfile({
      id: 'cust-f',
      kind: 'client',
      firstName: 'Meera',
      gender: 'female',
      preferences: { ageRange: { min: 28, max: 36 }, professions: ['technology', 'medicine'] },
    });
    const r = rankCandidates(customer, [...men, ...women], { now: NOW });
    expect(r.recommended.length).toBeGreaterThan(0);
    expect(r.recommended.every((x) => x.candidate.gender === 'male')).toBe(true);
    const b = r.recommended[0]!.breakdown;
    expect(b.weightProfile).toBe('female_customer');
    expect(b.categories.find((c) => c.key === 'careerEducation')?.weight).toBeGreaterThan(15);
  });

  it('applies the male assignment defaults (younger, earns less, shorter) and labels them as defaults', () => {
    const b = scoreCompatibility(maleCustomer(), femaleCandidate('f1'), ctx);
    const age = findCheck(b, 'age.relation.forward');
    const income = findCheck(b, 'careerEducation.income.forward');
    const height = findCheck(b, 'otherPreferences.heightRelation.forward');
    expect(age?.source).toBe('default_rule');
    expect(age?.outcome).toBe('match'); // 29 vs 32
    expect(income?.outcome).toBe('match'); // 20L vs 30L
    expect(height?.outcome).toBe('match'); // 162 vs 178
    expect(b.explanation.assumptions.some((a) => a.includes('assignment default'))).toBe(true);
  });

  it('does not apply the male defaults to female customers or to candidates', () => {
    const customer = makeProfile({ id: 'cust-f', kind: 'client', firstName: 'Meera', gender: 'female' });
    const b = scoreCompatibility(customer, makeProfile({ id: 'm1', gender: 'male' }), ctx);
    expect(allChecks(b).some((c) => c.source === 'default_rule')).toBe(false);
  });

  it('can switch the assignment rules off entirely', () => {
    const config = createConfig({
      assignmentRules: { enabled: false, relationDefaults: DEFAULT_CONFIG.assignmentRules.relationDefaults },
    });
    const b = scoreCompatibility(maleCustomer(), femaleCandidate('f1'), { now: NOW, config });
    expect(b.weightProfile).toBe('default');
    expect(allChecks(b).some((c) => c.source === 'default_rule')).toBe(false);
  });
});

describe('explicit preferences override defaults', () => {
  it('uses a stated "no_preference" instead of the age default', () => {
    const customer = maleCustomer({
      preferences: { partnerAgeRelation: 'no_preference', ageRange: { min: 25, max: 32 } },
    });
    const b = scoreCompatibility(customer, femaleCandidate('f1'), ctx);
    expect(findCheck(b, 'age.relation.forward')).toBeUndefined();
  });

  it('uses a stated "higher" preference, favouring an older partner', () => {
    const customer = maleCustomer({
      preferences: { partnerAgeRelation: 'higher', ageRange: { min: 25, max: 36 } },
    });
    const younger = femaleCandidate('f1', { dateOfBirth: '1997-05-10' }); // 29
    const older = femaleCandidate('f2', { dateOfBirth: '1991-05-10' }); // 35
    const bYoung = scoreCompatibility(customer, younger, ctx);
    const bOld = scoreCompatibility(customer, older, ctx);
    expect(findCheck(bOld, 'age.relation.forward')?.source).toBe('stated');
    expect(findCheck(bOld, 'age.relation.forward')?.outcome).toBe('match');
    expect(findCheck(bYoung, 'age.relation.forward')?.outcome).not.toBe('match');
  });

  it('lets an explicit income preference replace the default', () => {
    const customer = maleCustomer({
      preferences: { partnerIncomeRelation: 'similar', ageRange: { min: 25, max: 32 } },
    });
    const cand = femaleCandidate('f1', { career: { income: { amount: 3_100_000, currency: 'INR' } } });
    const check = findCheck(scoreCompatibility(customer, cand, ctx), 'careerEducation.income.forward');
    expect(check?.source).toBe('stated');
    expect(check?.outcome).toBe('match');
  });

  it('compares incomes across currencies using configured FX rates', () => {
    const cand = femaleCandidate('f1', { career: { income: { amount: 100_000, currency: 'USD' } } }); // ≈ ₹84 L
    const check = findCheck(scoreCompatibility(maleCustomer(), cand, ctx), 'careerEducation.income.forward');
    expect(check?.detail).toContain('earns more than');
  });
});

describe('mutuality', () => {
  it("caps the score when the candidate's own preferences are not met", () => {
    const customer = maleCustomer({
      preferences: { ageRange: { min: 25, max: 32 }, locations: [], diets: [] },
    });
    const happy = femaleCandidate('f1');
    const unhappy = femaleCandidate('f2', {
      preferences: {
        ageRange: { min: 24, max: 28 }, // customer (32) is outside
        locations: ['Delhi'],
        openToRelocation: 'no',
        maritalStatuses: ['divorced'],
        professions: ['medicine'],
        diets: ['vegan'],
        acceptsDrinking: 'no',
        partnerHeightRelation: 'higher',
        heightRangeCm: { min: 185, max: 195 },
      },
    });
    const good = scoreCompatibility(customer, happy, ctx);
    const bad = scoreCompatibility(customer, unhappy, ctx);
    expect(bad.directional.forCandidate).toBeLessThan(bad.directional.forCustomer);
    expect(bad.score).toBeLessThanOrEqual(bad.directional.forCandidate + DEFAULT_CONFIG.mutualityGap);
    expect(bad.score).toBeLessThan(good.score);
  });

  it('only recommends candidates at or above the minimum score', () => {
    const r = rankCandidates(
      maleCustomer(),
      [
        femaleCandidate('f1'),
        femaleCandidate('f2', { preferences: { wantsChildren: 'no', ageRange: { min: 40, max: 45 } } }),
      ],
      {
        now: NOW,
        minScore: 70,
      },
    );
    expect(r.recommended.every((x) => x.breakdown.score >= 70)).toBe(true);
    expect(r.summary.recommended + r.summary.belowThreshold).toBe(r.summary.eligible);
  });
});

describe('explanations', () => {
  it('only states facts present in the input profiles', () => {
    const cand = femaleCandidate('f1', {
      city: 'Pune',
      lifestyle: { interests: ['Trekking', 'Music'] },
      preferences: { openToRelocation: 'yes' },
    });
    const b = scoreCompatibility(maleCustomer(), cand, ctx);
    const text = [b.explanation.headline, ...b.explanation.strengths, ...b.explanation.considerations].join(
      ' ',
    );
    expect(text).toContain('Pune');
    expect(b.explanation.strengths.length).toBeGreaterThan(0);
    // Interests shared with the customer's [Travel, Music, Reading] is only Music.
    expect(findCheck(b, 'languageInterests.interests')?.detail).toBe(
      'Only one shared interest listed (music).',
    );
  });
});
