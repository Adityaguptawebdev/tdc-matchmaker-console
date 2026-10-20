import mongoose, { Schema } from 'mongoose';
import {
  CURRENCIES,
  DEAL_BREAKERS,
  DIETS,
  EDUCATION_LEVELS,
  FAMILY_TYPES,
  FAMILY_VALUES,
  GENDERS,
  HABIT_FREQUENCIES,
  JOURNEY_STATUSES,
  MARITAL_STATUSES,
  MARRIAGE_TIMELINES,
  MEMBERSHIP_TIERS,
  PET_STATUSES,
  PROFESSION_CATEGORIES,
  PROFILE_KINDS,
  PROFILE_STATUSES,
  RELATIVE_PREFERENCES,
  VERIFICATION_STATUSES,
  YES_NO_MAYBE,
} from '@tdc/shared';

/** Nullable enum string helper: Mongoose's `enum` validator must explicitly allow null. */
const nullableEnum = (values: readonly string[]) => ({
  type: String,
  enum: [...values, null],
  default: null,
});
const nullableString = { type: String, default: null };
const nullableNumber = { type: Number, default: null };
const rangeSchema = new Schema({ min: Number, max: Number }, { _id: false });
const opts = { _id: false } as const;

const profileSchema = new Schema(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: PROFILE_KINDS, required: true },
    status: { type: String, enum: PROFILE_STATUSES, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: nullableEnum(GENDERS),
    dateOfBirth: nullableString,
    heightCm: nullableNumber,
    country: nullableString,
    city: nullableString,
    contact: new Schema({ email: nullableString, phone: nullableString }, opts),
    about: nullableString,
    verification: new Schema(
      {
        status: { type: String, enum: VERIFICATION_STATUSES, required: true },
        verifiedAt: nullableString,
        method: nullableString,
      },
      opts,
    ),
    education: new Schema(
      {
        college: nullableString,
        degree: nullableString,
        level: nullableEnum(EDUCATION_LEVELS),
        field: nullableString,
      },
      opts,
    ),
    career: new Schema(
      {
        company: nullableString,
        designation: nullableString,
        profession: nullableString,
        professionCategory: nullableEnum(PROFESSION_CATEGORIES),
        income: {
          type: new Schema({ amount: Number, currency: { type: String, enum: CURRENCIES } }, opts),
          default: null,
        },
        careerGoals: nullableString,
        workLocation: nullableString,
      },
      opts,
    ),
    background: new Schema(
      {
        maritalStatus: nullableEnum(MARITAL_STATUSES),
        religion: nullableString,
        community: nullableString,
        subCommunity: nullableString,
        motherTongue: nullableString,
        languages: { type: [String], default: [] },
        familyType: nullableEnum(FAMILY_TYPES),
        familyValues: nullableEnum(FAMILY_VALUES),
        siblings: {
          type: new Schema({ brothers: Number, sisters: Number, details: nullableString }, opts),
          default: null,
        },
        familyBackground: nullableString,
      },
      opts,
    ),
    lifestyle: new Schema(
      {
        diet: nullableEnum(DIETS),
        smoking: nullableEnum(HABIT_FREQUENCIES),
        drinking: nullableEnum(HABIT_FREQUENCIES),
        interests: { type: [String], default: [] },
        pets: nullableEnum(PET_STATUSES),
      },
      opts,
    ),
    preferences: new Schema(
      {
        wantsChildren: nullableEnum(YES_NO_MAYBE),
        openToRelocation: nullableEnum(YES_NO_MAYBE),
        openToPets: nullableEnum(YES_NO_MAYBE),
        marriageTimeline: nullableEnum(MARRIAGE_TIMELINES),
        ageRange: { type: rangeSchema, default: null },
        heightRangeCm: { type: rangeSchema, default: null },
        partnerAgeRelation: nullableEnum(RELATIVE_PREFERENCES),
        partnerHeightRelation: nullableEnum(RELATIVE_PREFERENCES),
        partnerIncomeRelation: nullableEnum(RELATIVE_PREFERENCES),
        // Arrays that may be null ("not stated") vs [] ("open to any") — the distinction is meaningful.
        locations: { type: [String], default: null },
        minEducationLevel: nullableEnum(EDUCATION_LEVELS),
        professions: { type: [{ type: String, enum: PROFESSION_CATEGORIES }], default: null },
        diets: { type: [{ type: String, enum: DIETS }], default: null },
        acceptsSmoking: nullableEnum(YES_NO_MAYBE),
        acceptsDrinking: nullableEnum(YES_NO_MAYBE),
        maritalStatuses: { type: [{ type: String, enum: MARITAL_STATUSES }], default: null },
        languages: { type: [String], default: null },
        religions: { type: [String], default: null },
        communities: { type: [String], default: null },
        values: { type: [String], default: [] },
        dealBreakers: { type: [{ type: String, enum: DEAL_BREAKERS }], default: [] },
        dealBreakerNotes: nullableString,
      },
      opts,
    ),
    matchmaking: {
      type: new Schema(
        {
          ownerId: { type: String, required: true },
          journeyStatus: { type: String, enum: JOURNEY_STATUSES, required: true },
          lastContactedAt: nullableString,
          joinedAt: { type: String, required: true },
          membershipTier: { type: String, enum: MEMBERSHIP_TIERS, required: true },
        },
        opts,
      ),
      default: null,
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false, collection: 'profiles', minimize: false },
);

profileSchema.index({ kind: 1, 'matchmaking.ownerId': 1 });
profileSchema.index({ gender: 1, status: 1 });

export const ProfileModel = mongoose.models.Profile ?? mongoose.model('Profile', profileSchema);
