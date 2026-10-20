import type {
  DealBreaker,
  Diet,
  Gender,
  HabitFrequency,
  MaritalStatus,
  Profile,
  ProfessionCategory,
  RelativePreference,
  YesNoMaybe,
} from '@tdc/shared';
import { PROFESSION_CATEGORIES } from '@tdc/shared';
import {
  ABROAD,
  CAREER_GOALS,
  DIET_DEFAULT,
  GROUPS,
  INTERESTS,
  PARENT_OCCUPATIONS,
  PROFESSIONS,
  VALUES,
  type CulturalGroup,
} from './pools';
import { Rng } from './random';

/** Fixed seed and epoch: the member pool is byte-for-byte reproducible across runs and machines. */
export const MEMBER_SEED = 20261019;
const EPOCH = Date.UTC(2026, 0, 15, 10, 0, 0);
const REFERENCE_YEAR = 2026;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function yesNoMaybe(rng: Rng, yes: number, maybe: number, no: number, missing = 0.05): YesNoMaybe | null {
  if (rng.chance(missing)) return null;
  return rng.weighted<YesNoMaybe>([
    ['yes', yes],
    ['maybe', maybe],
    ['no', no],
  ]);
}

function pickDiet(rng: Rng, group: CulturalGroup): Diet {
  if (group.key === 'jain') return rng.chance(0.6) ? 'jain' : 'vegetarian';
  return rng.chance(group.vegetarianBias)
    ? 'vegetarian'
    : rng.weighted(DIET_DEFAULT.filter(([d]) => d !== 'vegetarian'));
}

function relation(rng: Rng, gender: Gender, kind: 'age' | 'height' | 'income'): RelativePreference | null {
  if (rng.chance(0.72)) return null;
  // A minority state a relative preference explicitly; both directions occur for both genders.
  const lean: RelativePreference = gender === 'male' ? 'lower' : 'higher';
  return rng.weighted<RelativePreference>([
    [lean, kind === 'income' ? 2 : 4],
    ['similar', 3],
    ['no_preference', 3],
    [lean === 'lower' ? 'higher' : 'lower', 1],
  ]);
}

export function generateMembers(count = 130): Profile[] {
  const rng = new Rng(MEMBER_SEED);
  const used = new Set<string>();
  const profiles: Profile[] = [];

  for (let i = 0; i < count; i++) {
    const gender: Gender = i % 2 === 0 ? 'female' : 'male';
    const group = rng.weighted(GROUPS.map((g) => [g, g.weight] as const));

    // Prefer first names not used yet so the demo pool rarely shows two people with the same first name.
    let firstName = '';
    let lastName = '';
    for (let attempt = 0; attempt < 30; attempt++) {
      firstName = rng.pick(gender === 'male' ? group.male : group.female);
      lastName = rng.pick(group.surnames);
      if (!used.has(firstName) && !used.has(`${firstName} ${lastName}`)) break;
    }
    used.add(firstName);
    used.add(`${firstName} ${lastName}`);

    const age = gender === 'male' ? rng.int(26, 39) : rng.int(24, 36);
    const dob = `${REFERENCE_YEAR - age - (rng.chance(0.5) ? 1 : 0)}-${pad(rng.int(1, 12))}-${pad(rng.int(1, 28))}`;
    const height = Math.round(
      Math.min(
        Math.max(
          gender === 'male' ? rng.normal(174, 6.5) : rng.normal(161, 6),
          gender === 'male' ? 160 : 148,
        ),
        gender === 'male' ? 192 : 180,
      ),
    );

    const abroad = rng.chance(0.07) ? rng.pick(ABROAD) : null;
    const city = abroad ? abroad.city : rng.pick(group.cities);

    const prof = rng.weighted(PROFESSIONS.map((p) => [p, p.weight] as const));
    const edu = rng.pick(prof.degrees);
    const lakh = rng.int(prof.incomeLakh[0], prof.incomeLakh[1]) * (abroad ? 1.8 : 1);
    const income = abroad
      ? { amount: Math.round((lakh * abroad.perLakhInr) / 1000) * 1000, currency: abroad.currency }
      : { amount: Math.round(lakh) * 100_000, currency: 'INR' as const };

    const marital: MaritalStatus =
      age >= 31
        ? rng.weighted([
            ['never_married', 80],
            ['divorced', 15],
            ['widowed', 5],
          ] as const)
        : rng.weighted([
            ['never_married', 95],
            ['divorced', 5],
          ] as const);
    const religionShared = rng.chance(0.82);
    const community = religionShared && rng.chance(0.62) ? rng.pick(group.communities) : null;
    const diet = pickDiet(rng, group);
    const smoking: HabitFrequency = rng.weighted([
      ['never', 82],
      ['occasionally', 13],
      ['regularly', 5],
    ] as const);
    const drinking: HabitFrequency = rng.weighted([
      ['never', 42],
      ['occasionally', 47],
      ['regularly', 11],
    ] as const);
    const interests = rng.sample(INTERESTS, rng.int(3, 5));
    const languages = [
      ...new Set([
        ...group.languages,
        ...(rng.chance(0.3) && !group.languages.includes('Hindi') ? ['Hindi'] : []),
      ]),
    ];
    const familyValues = rng.weighted([
      ['traditional', 28],
      ['moderate', 52],
      ['liberal', 20],
    ] as const);

    // Preferences are generated relative to the person so they are internally consistent.
    const ageRange = rng.chance(0.08)
      ? null
      : gender === 'male'
        ? { min: Math.max(21, age - rng.int(4, 8)), max: age + rng.int(0, 2) }
        : { min: Math.max(21, age - rng.int(0, 2)), max: age + rng.int(3, 7) };

    const locations = rng.chance(0.1)
      ? null
      : rng.chance(0.28)
        ? []
        : [
            ...new Set([
              city,
              ...rng.sample(
                group.cities.filter((c) => c !== city),
                rng.int(0, 2),
              ),
            ]),
          ];

    const professions: ProfessionCategory[] | null = rng.chance(0.5)
      ? null
      : rng.chance(0.5)
        ? []
        : rng.sample(PROFESSION_CATEGORIES, rng.int(2, 4));

    const vegetarianSelf = diet !== 'non_vegetarian' && diet !== 'eggetarian';
    const diets: Diet[] | null = rng.chance(0.08)
      ? null
      : vegetarianSelf && rng.chance(0.6)
        ? ['vegetarian', 'jain', 'vegan']
        : [];

    const maritalStatuses: MaritalStatus[] | null = rng.chance(0.06)
      ? null
      : marital === 'never_married'
        ? rng.weighted<MaritalStatus[]>([
            [['never_married'], 55],
            [['never_married', 'divorced'], 22],
            [[], 23],
          ])
        : rng.chance(0.5)
          ? []
          : ['never_married', 'divorced', 'widowed'];

    const dealBreakers = new Set<DealBreaker>();
    if (smoking === 'never' && rng.chance(0.25)) dealBreakers.add('smoker');
    if (vegetarianSelf && rng.chance(0.3)) dealBreakers.add('non_vegetarian');
    if (rng.chance(0.12)) dealBreakers.add('children_mismatch');
    if (rng.chance(0.07)) dealBreakers.add('drinks_regularly');
    if (ageRange && rng.chance(0.08)) dealBreakers.add('age_outside_range');
    if (religionShared && rng.chance(0.07)) dealBreakers.add('different_religion');
    if (marital === 'never_married' && rng.chance(0.06)) dealBreakers.add('previously_married');
    if (rng.chance(0.04)) dealBreakers.add('unverified_profile');

    const brothers = rng.int(0, 2);
    const sisters = rng.int(0, 2);
    const father = rng.pick(PARENT_OCCUPATIONS.filter((p) => p !== 'a homemaker'));
    const mother = rng.pick(PARENT_OCCUPATIONS);
    const hometown = rng.pick(group.cities);
    const created = new Date(EPOCH + i * 37 * 3600_000).toISOString();
    const verification = rng.weighted([
      ['verified', 70],
      ['pending', 18],
      ['unverified', 12],
    ] as const);

    profiles.push({
      id: `mem_${pad(i + 1, 3)}`,
      kind: 'member',
      status: rng.weighted([
        ['active', 96],
        ['paused', 3],
        ['engaged', 1],
      ] as const),
      firstName,
      lastName,
      gender,
      dateOfBirth: dob,
      heightCm: height,
      country: abroad ? abroad.country : 'India',
      city,
      contact: {
        // Reserved example.com domain and an invalid +91 0… range: guaranteed not to reach a real person.
        email: `${slug(firstName)}.${slug(lastName)}.${pad(i + 1, 3)}@example.com`,
        phone: `+91 00000 ${pad(10000 + i * 7, 5)}`,
      },
      about: `${prof.profession} based in ${city}. Enjoys ${interests.slice(0, 2).join(' and ').toLowerCase()}. Looking for a partner who values ${rng.pick(VALUES).toLowerCase()}.`,
      verification: {
        status: verification,
        verifiedAt: verification === 'verified' ? new Date(EPOCH + i * 41 * 3600_000).toISOString() : null,
        method:
          verification === 'verified'
            ? rng.pick(['Government ID', 'Video KYC', 'Government ID + LinkedIn'])
            : null,
      },
      education: { college: rng.pick(edu.colleges), degree: edu.degree, level: edu.level, field: edu.field },
      career: {
        company: rng.pick(prof.companies),
        designation: rng.pick(prof.designations),
        profession: prof.profession,
        professionCategory: prof.category,
        income,
        careerGoals: rng.pick(CAREER_GOALS[prof.category]),
        workLocation: rng.chance(0.15) ? `${city} (hybrid)` : city,
      },
      background: {
        maritalStatus: marital,
        religion: religionShared ? group.religion : null,
        community: community?.name ?? null,
        subCommunity: community && community.sub.length && rng.chance(0.5) ? rng.pick(community.sub) : null,
        motherTongue: group.motherTongue,
        languages,
        familyType: rng.chance(0.7) ? 'nuclear' : 'joint',
        familyValues,
        siblings: {
          brothers,
          sisters,
          details:
            brothers + sisters === 0
              ? 'Only child'
              : `${brothers} brother${brothers === 1 ? '' : 's'}, ${sisters} sister${sisters === 1 ? '' : 's'}`,
        },
        familyBackground: `Father is ${father}; mother is ${mother}. Family based in ${hometown}.`,
      },
      lifestyle: {
        diet,
        smoking,
        drinking,
        interests,
        pets: rng.chance(0.05) ? null : rng.chance(0.24) ? 'has_pets' : 'no_pets',
      },
      preferences: {
        wantsChildren: yesNoMaybe(rng, 64, 17, 12, 0.07),
        openToRelocation: abroad ? yesNoMaybe(rng, 55, 30, 15) : yesNoMaybe(rng, 34, 36, 25),
        openToPets: yesNoMaybe(rng, 45, 32, 18),
        marriageTimeline: rng.chance(0.05)
          ? null
          : rng.weighted([
              ['within_1_year', 35],
              ['1_to_2_years', 45],
              ['open', 15],
            ] as const),
        ageRange,
        heightRangeCm: rng.chance(0.3)
          ? gender === 'male'
            ? { min: 150, max: Math.min(height, 172) }
            : { min: Math.max(height, 165), max: 190 }
          : null,
        partnerAgeRelation: relation(rng, gender, 'age'),
        partnerHeightRelation: relation(rng, gender, 'height'),
        partnerIncomeRelation: relation(rng, gender, 'income'),
        locations,
        minEducationLevel: rng.chance(0.55)
          ? null
          : rng.weighted([
              ['bachelors', 60],
              ['masters', 40],
            ] as const),
        professions,
        diets,
        acceptsSmoking: smoking !== 'never' ? yesNoMaybe(rng, 60, 30, 10) : yesNoMaybe(rng, 8, 22, 70),
        acceptsDrinking: drinking !== 'never' ? yesNoMaybe(rng, 75, 20, 5) : yesNoMaybe(rng, 25, 35, 40),
        maritalStatuses,
        languages: rng.chance(0.75) ? null : [group.motherTongue],
        religions: religionShared && rng.chance(0.25) ? [group.religion] : null,
        communities: community && rng.chance(0.15) ? [community.name] : null,
        values: rng.sample(VALUES, 3),
        dealBreakers: [...dealBreakers],
        dealBreakerNotes: null,
      },
      matchmaking: null,
      createdAt: created,
      updatedAt: created,
    });
  }
  return profiles;
}
