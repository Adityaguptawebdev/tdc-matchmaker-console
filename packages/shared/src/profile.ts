import type {
  Currency,
  DealBreaker,
  Diet,
  EducationLevel,
  FamilyType,
  FamilyValues,
  Gender,
  HabitFrequency,
  JourneyStatus,
  MaritalStatus,
  MarriageTimeline,
  MembershipTier,
  PetStatus,
  ProfessionCategory,
  ProfileKind,
  ProfileStatus,
  RelativePreference,
  VerificationStatus,
  YesNoMaybe,
} from './enums';

/**
 * Preference semantics used throughout the system:
 *   - `null` / `undefined`  → not stated (unknown). The engine treats it as missing evidence.
 *   - `[]` (empty array)    → explicitly open to anything (a satisfied preference).
 *   - non-empty array       → acceptable values.
 */
export interface Range {
  min: number;
  max: number;
}

export interface Money {
  /** Annual gross income in whole units of `currency`. */
  amount: number;
  currency: Currency;
}

export interface Education {
  college: string | null;
  degree: string | null;
  level: EducationLevel | null;
  field: string | null;
}

export interface Career {
  company: string | null;
  designation: string | null;
  profession: string | null;
  professionCategory: ProfessionCategory | null;
  income: Money | null;
  careerGoals: string | null;
  workLocation: string | null;
}

export interface Siblings {
  brothers: number;
  sisters: number;
  details: string | null;
}

export interface Background {
  maritalStatus: MaritalStatus | null;
  /** Voluntarily provided; may be null ("prefer not to say"). Never used for scoring unless the person states a preference. */
  religion: string | null;
  community: string | null;
  subCommunity: string | null;
  motherTongue: string | null;
  languages: string[];
  familyType: FamilyType | null;
  familyValues: FamilyValues | null;
  siblings: Siblings | null;
  familyBackground: string | null;
}

export interface Lifestyle {
  diet: Diet | null;
  smoking: HabitFrequency | null;
  drinking: HabitFrequency | null;
  interests: string[];
  pets: PetStatus | null;
}

export interface PartnerPreferences {
  wantsChildren: YesNoMaybe | null;
  openToRelocation: YesNoMaybe | null;
  openToPets: YesNoMaybe | null;
  marriageTimeline: MarriageTimeline | null;
  ageRange: Range | null;
  heightRangeCm: Range | null;
  /** Relative preferences; `null` means not stated (assignment default rules may apply, see engine docs). */
  partnerAgeRelation: RelativePreference | null;
  partnerHeightRelation: RelativePreference | null;
  partnerIncomeRelation: RelativePreference | null;
  locations: string[] | null;
  minEducationLevel: EducationLevel | null;
  professions: ProfessionCategory[] | null;
  diets: Diet[] | null;
  acceptsSmoking: YesNoMaybe | null;
  acceptsDrinking: YesNoMaybe | null;
  maritalStatuses: MaritalStatus[] | null;
  languages: string[] | null;
  /** Voluntarily specified cultural preference. */
  religions: string[] | null;
  /** Displayed for context; intentionally never scored by the engine. */
  communities: string[] | null;
  values: string[];
  dealBreakers: DealBreaker[];
  dealBreakerNotes: string | null;
}

export interface Verification {
  status: VerificationStatus;
  verifiedAt: string | null;
  method: string | null;
}

export interface MatchmakingInfo {
  ownerId: string;
  journeyStatus: JourneyStatus;
  lastContactedAt: string | null;
  joinedAt: string;
  membershipTier: MembershipTier;
}

export interface Contact {
  email: string | null;
  phone: string | null;
}

export interface Profile {
  id: string;
  kind: ProfileKind;
  status: ProfileStatus;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  /** ISO calendar date (YYYY-MM-DD). Age is always computed from this. */
  dateOfBirth: string | null;
  heightCm: number | null;
  country: string | null;
  city: string | null;
  contact: Contact;
  about: string | null;
  verification: Verification;
  education: Education;
  career: Career;
  background: Background;
  lifestyle: Lifestyle;
  preferences: PartnerPreferences;
  /** Present only for TDC clients (customers) assigned to a matchmaker. */
  matchmaking: MatchmakingInfo | null;
  createdAt: string;
  updatedAt: string;
}

/** Computes age in completed years at `asOf`. Returns null for missing/invalid dates. */
export function computeAge(dateOfBirth: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let age = asOf.getUTCFullYear() - year;
  const beforeBirthday =
    asOf.getUTCMonth() + 1 < month || (asOf.getUTCMonth() + 1 === month && asOf.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function fullName(p: Pick<Profile, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function formatHeight(cm: number | null | undefined): string {
  if (cm == null) return 'Not specified';
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′${inches}″ (${cm} cm)`;
}
