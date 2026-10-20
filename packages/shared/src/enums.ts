/**
 * Canonical enums shared by the API, the matching engine and the web app.
 * Every enum has a matching label map so the UI never renders raw codes.
 */

export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { male: 'Male', female: 'Female' };

export const MARITAL_STATUSES = ['never_married', 'divorced', 'widowed'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  never_married: 'Never married',
  divorced: 'Divorced',
  widowed: 'Widowed',
};

export const VERIFICATION_STATUSES = ['verified', 'pending', 'unverified'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: 'Verified',
  pending: 'Verification pending',
  unverified: 'Unverified',
};

export const YES_NO_MAYBE = ['yes', 'no', 'maybe'] as const;
export type YesNoMaybe = (typeof YES_NO_MAYBE)[number];
export const YES_NO_MAYBE_LABELS: Record<YesNoMaybe, string> = { yes: 'Yes', no: 'No', maybe: 'Maybe' };

export const EDUCATION_LEVELS = ['bachelors', 'masters', 'professional', 'doctorate'] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  bachelors: "Bachelor's",
  masters: "Master's",
  professional: 'Professional (MBBS, CA, LLB…)',
  doctorate: 'Doctorate',
};
/** Ordinal rank used when comparing "minimum education" preferences. */
export const EDUCATION_RANK: Record<EducationLevel, number> = {
  bachelors: 1,
  masters: 2,
  professional: 2,
  doctorate: 3,
};

export const PROFESSION_CATEGORIES = [
  'technology',
  'medicine',
  'finance',
  'law',
  'business',
  'consulting',
  'design',
  'architecture',
  'education',
  'government',
  'media',
  'science',
  'aviation',
] as const;
export type ProfessionCategory = (typeof PROFESSION_CATEGORIES)[number];
export const PROFESSION_CATEGORY_LABELS: Record<ProfessionCategory, string> = {
  technology: 'Technology',
  medicine: 'Medicine & Healthcare',
  finance: 'Finance',
  law: 'Law',
  business: 'Business & Management',
  consulting: 'Consulting',
  design: 'Design',
  architecture: 'Architecture',
  education: 'Education & Academia',
  government: 'Government & Public Service',
  media: 'Media & Communications',
  science: 'Science & Research',
  aviation: 'Aviation',
};

export const CURRENCIES = ['INR', 'USD', 'GBP', 'SGD', 'AED'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DIETS = ['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'jain'] as const;
export type Diet = (typeof DIETS)[number];
export const DIET_LABELS: Record<Diet, string> = {
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_vegetarian: 'Non-vegetarian',
  vegan: 'Vegan',
  jain: 'Jain',
};

export const HABIT_FREQUENCIES = ['never', 'occasionally', 'regularly'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];
export const HABIT_LABELS: Record<HabitFrequency, string> = {
  never: 'Never',
  occasionally: 'Occasionally',
  regularly: 'Regularly',
};

export const FAMILY_TYPES = ['nuclear', 'joint'] as const;
export type FamilyType = (typeof FAMILY_TYPES)[number];
export const FAMILY_TYPE_LABELS: Record<FamilyType, string> = { nuclear: 'Nuclear', joint: 'Joint' };

export const FAMILY_VALUES = ['traditional', 'moderate', 'liberal'] as const;
export type FamilyValues = (typeof FAMILY_VALUES)[number];
export const FAMILY_VALUES_LABELS: Record<FamilyValues, string> = {
  traditional: 'Traditional',
  moderate: 'Moderate',
  liberal: 'Liberal',
};

export const PET_STATUSES = ['has_pets', 'no_pets'] as const;
export type PetStatus = (typeof PET_STATUSES)[number];
export const PET_STATUS_LABELS: Record<PetStatus, string> = { has_pets: 'Has pets', no_pets: 'No pets' };

export const MARRIAGE_TIMELINES = ['within_1_year', '1_to_2_years', 'open'] as const;
export type MarriageTimeline = (typeof MARRIAGE_TIMELINES)[number];
export const MARRIAGE_TIMELINE_LABELS: Record<MarriageTimeline, string> = {
  within_1_year: 'Within 1 year',
  '1_to_2_years': '1–2 years',
  open: 'Open / flexible',
};

/** Relative preferences ("I'd prefer a partner who is younger/shorter/earns less…"). */
export const RELATIVE_PREFERENCES = ['lower', 'similar', 'higher', 'no_preference'] as const;
export type RelativePreference = (typeof RELATIVE_PREFERENCES)[number];
export const RELATIVE_AGE_LABELS: Record<RelativePreference, string> = {
  lower: 'Younger',
  similar: 'Similar age',
  higher: 'Older',
  no_preference: 'No preference',
};
export const RELATIVE_HEIGHT_LABELS: Record<RelativePreference, string> = {
  lower: 'Shorter',
  similar: 'Similar height',
  higher: 'Taller',
  no_preference: 'No preference',
};
export const RELATIVE_INCOME_LABELS: Record<RelativePreference, string> = {
  lower: 'Earns less',
  similar: 'Similar income',
  higher: 'Earns more',
  no_preference: 'No preference',
};

/**
 * Deal-breakers are structured so the engine can enforce them deterministically.
 * Free-text concerns live in `preferences.dealBreakerNotes` and are shown to the
 * matchmaker but never machine-enforced.
 */
export const DEAL_BREAKERS = [
  'smoker',
  'drinks_regularly',
  'non_vegetarian',
  'age_outside_range',
  'height_outside_range',
  'children_mismatch',
  'unwilling_to_relocate',
  'previously_married',
  'different_religion',
  'unverified_profile',
] as const;
export type DealBreaker = (typeof DEAL_BREAKERS)[number];
export const DEAL_BREAKER_LABELS: Record<DealBreaker, string> = {
  smoker: 'Partner smokes',
  drinks_regularly: 'Partner drinks regularly',
  non_vegetarian: 'Partner is non-vegetarian',
  age_outside_range: 'Age outside preferred range',
  height_outside_range: 'Height outside preferred range',
  children_mismatch: 'Opposite views on having children',
  unwilling_to_relocate: 'Partner in another city and unwilling to relocate',
  previously_married: 'Partner previously married',
  different_religion: 'Different religion',
  unverified_profile: 'Partner profile not verified',
};

export const PROFILE_KINDS = ['client', 'member'] as const;
export type ProfileKind = (typeof PROFILE_KINDS)[number];

export const PROFILE_STATUSES = ['active', 'paused', 'engaged'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const JOURNEY_STATUSES = [
  'new',
  'onboarding',
  'awaiting_matches',
  'matches_sent',
  'meeting_scheduled',
  'in_discussion',
  'on_hold',
  'matched',
] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];
export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  new: 'New',
  onboarding: 'Onboarding',
  awaiting_matches: 'Awaiting matches',
  matches_sent: 'Matches sent',
  meeting_scheduled: 'Meeting scheduled',
  in_discussion: 'In discussion',
  on_hold: 'On hold',
  matched: 'Matched',
};

export const MEMBERSHIP_TIERS = ['signature', 'premium', 'elite'] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];
export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  signature: 'Signature',
  premium: 'Premium',
  elite: 'Elite',
};

export const NOTE_TYPES = ['call', 'meeting', 'note', 'feedback'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];
export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  note: 'Internal note',
  feedback: 'Client feedback',
};

/** Lifecycle of a match introduction that has been sent. */
export const MATCH_STATUSES = [
  'pending',
  'interested',
  'not_interested',
  'meeting_scheduled',
  'rejected',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: 'Pending',
  interested: 'Interested',
  not_interested: 'Not interested',
  meeting_scheduled: 'Meeting scheduled',
  rejected: 'Rejected',
};

/** Matchmaker feedback on a suggestion before (or instead of) sending it. */
export const SUGGESTION_DECISIONS = ['shortlisted', 'dismissed'] as const;
export type SuggestionDecision = (typeof SUGGESTION_DECISIONS)[number];

export const ACTIVITY_TYPES = [
  'note_added',
  'note_updated',
  'note_deleted',
  'match_sent',
  'match_feedback',
  'journey_status_changed',
  'suggestion_shortlisted',
  'suggestion_dismissed',
  'suggestion_restored',
  'contact_logged',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MATCHMAKER_ROLES = ['matchmaker', 'lead'] as const;
export type MatchmakerRole = (typeof MATCHMAKER_ROLES)[number];
