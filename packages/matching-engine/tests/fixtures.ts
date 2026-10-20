import type { Profile } from '@tdc/shared';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object | null ? DeepPartial<NonNullable<T[K]>> | T[K] : T[K];
};

export const NOW = new Date('2026-10-01T00:00:00Z');

/** A complete, mutually-compatible baseline profile; tests override only what they exercise. */
export function makeProfile(overrides: DeepPartial<Profile> & { id: string }): Profile {
  const base: Profile = {
    id: overrides.id,
    kind: 'member',
    status: 'active',
    firstName: 'Test',
    lastName: 'Person',
    gender: 'female',
    dateOfBirth: '1997-05-10', // 29 at NOW
    heightCm: 162,
    country: 'India',
    city: 'Bengaluru',
    contact: { email: null, phone: null },
    about: null,
    verification: { status: 'verified', verifiedAt: '2026-01-01T00:00:00Z', method: 'id_document' },
    education: { college: 'Test College', degree: 'B.Tech', level: 'bachelors', field: 'Engineering' },
    career: {
      company: 'Acme',
      designation: 'Engineer',
      profession: 'Software Engineer',
      professionCategory: 'technology',
      income: { amount: 2_000_000, currency: 'INR' },
      careerGoals: null,
      workLocation: 'Bengaluru',
    },
    background: {
      maritalStatus: 'never_married',
      religion: null,
      community: null,
      subCommunity: null,
      motherTongue: 'Hindi',
      languages: ['Hindi', 'English'],
      familyType: 'nuclear',
      familyValues: 'moderate',
      siblings: { brothers: 0, sisters: 1, details: null },
      familyBackground: null,
    },
    lifestyle: {
      diet: 'vegetarian',
      smoking: 'never',
      drinking: 'occasionally',
      interests: ['Travel', 'Music', 'Reading'],
      pets: 'no_pets',
    },
    preferences: {
      wantsChildren: 'yes',
      openToRelocation: 'maybe',
      openToPets: 'yes',
      marriageTimeline: '1_to_2_years',
      ageRange: { min: 26, max: 36 },
      heightRangeCm: null,
      partnerAgeRelation: null,
      partnerHeightRelation: null,
      partnerIncomeRelation: null,
      locations: ['Bengaluru'],
      minEducationLevel: null,
      professions: [],
      diets: [],
      acceptsSmoking: 'no',
      acceptsDrinking: 'yes',
      maritalStatuses: ['never_married'],
      languages: null,
      religions: null,
      communities: null,
      values: ['Honesty', 'Family'],
      dealBreakers: [],
      dealBreakerNotes: null,
    },
    matchmaking: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  return deepMerge(base, overrides) as Profile;
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (source === undefined) return target;
  if (source === null || typeof source !== 'object' || Array.isArray(source)) return source;
  if (target === null || typeof target !== 'object' || Array.isArray(target)) return source;
  const out: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    out[k] = deepMerge((target as Record<string, unknown>)[k], v);
  }
  return out;
}

export const maleCustomer = (o: DeepPartial<Profile> = {}) =>
  makeProfile({
    id: 'cust-m',
    kind: 'client',
    firstName: 'Arjun',
    gender: 'male',
    dateOfBirth: '1994-03-01', // 32
    heightCm: 178,
    career: { income: { amount: 3_000_000, currency: 'INR' } },
    preferences: { ageRange: { min: 25, max: 32 } },
    ...o,
  });

export const femaleCandidate = (id: string, o: DeepPartial<Profile> = {}) =>
  makeProfile({ firstName: 'Kavya', ...o, id, gender: 'gender' in o ? o.gender : 'female' });
