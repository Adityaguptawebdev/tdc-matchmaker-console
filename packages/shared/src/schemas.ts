import { z } from 'zod';
import {
  GENDERS,
  JOURNEY_STATUSES,
  MARITAL_STATUSES,
  MATCH_STATUSES,
  NOTE_TYPES,
  PROFESSION_CATEGORIES,
  VERIFICATION_STATUSES,
} from './enums';

/**
 * Validation schemas shared by the web forms (React Hook Form) and the API (request validation).
 */

const queryBoolean = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const page = z.coerce.number().int().min(1).max(10_000).default(1);
const pageSize = (max: number, def: number) => z.coerce.number().int().min(1).max(max).default(def);

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Enter your username or email' })
    .trim()
    .min(3, 'Enter your username or email')
    .max(254, 'That looks too long'),
  password: z
    .string({ required_error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(200, 'Password is too long'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const CUSTOMER_SORT_FIELDS = ['name', 'age', 'lastContacted', 'journeyStatus'] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  journeyStatus: z.enum(JOURNEY_STATUSES).optional(),
  gender: z.enum(GENDERS).optional(),
  verification: z.enum(VERIFICATION_STATUSES).optional(),
  maritalStatus: z.enum(MARITAL_STATUSES).optional(),
  sort: z.enum(CUSTOMER_SORT_FIELDS).default('lastContacted'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page,
  pageSize: pageSize(100, 10),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export const customerUpdateSchema = z
  .object({
    journeyStatus: z.enum(JOURNEY_STATUSES).optional(),
    lastContactedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const noteCreateSchema = z.object({
  type: z.enum(NOTE_TYPES),
  body: z
    .string()
    .trim()
    .min(3, 'Note must be at least 3 characters')
    .max(2000, 'Keep notes under 2,000 characters'),
  /** When true, the customer's "last contacted" date is set to `contactedAt` (or now). */
  markContacted: z.boolean().default(false),
  contactedAt: z.string().datetime({ offset: true }).optional(),
});
export type NoteCreateInput = z.input<typeof noteCreateSchema>;

export const noteUpdateSchema = z
  .object({
    type: z.enum(NOTE_TYPES).optional(),
    body: z
      .string()
      .trim()
      .min(3, 'Note must be at least 3 characters')
      .max(2000, 'Keep notes under 2,000 characters')
      .optional(),
  })
  .strict()
  .refine((v) => v.type !== undefined || v.body !== undefined, { message: 'Nothing to update' });
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export const RECOMMENDATION_SORTS = ['score', 'age', 'name', 'confidence'] as const;

export const recommendationQuerySchema = z
  .object({
    city: z.string().trim().max(60).optional(),
    minAge: z.coerce.number().int().min(18).max(80).optional(),
    maxAge: z.coerce.number().int().min(18).max(80).optional(),
    professionCategory: z.enum(PROFESSION_CATEGORIES).optional(),
    verifiedOnly: queryBoolean,
    sort: z.enum(RECOMMENDATION_SORTS).default('score'),
    order: z.enum(['asc', 'desc']).default('desc'),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((v) => v.minAge === undefined || v.maxAge === undefined || v.minAge <= v.maxAge, {
    message: 'minAge must be less than or equal to maxAge',
    path: ['minAge'],
  });
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;

export const suggestionDecisionSchema = z.object({
  decision: z.enum(['shortlisted', 'dismissed', 'none']),
  reason: z.string().trim().max(300).optional(),
});
export type SuggestionDecisionInput = z.infer<typeof suggestionDecisionSchema>;

export const introductionRequestSchema = z.object({
  customerId: z.string().min(1).max(64),
  candidateId: z.string().min(1).max(64),
});

export const sendMatchSchema = z.object({
  customerId: z.string().min(1).max(64),
  candidateId: z.string().min(1).max(64),
  introduction: z
    .string()
    .trim()
    .min(40, 'The introduction should be at least 40 characters')
    .max(1500, 'Keep the introduction under 1,500 characters'),
  introductionSource: z.enum(['ai', 'fallback', 'edited']),
  /** Explicit confirmation is required server-side, not only in the UI. */
  confirm: z.literal(true, { errorMap: () => ({ message: 'Sending requires explicit confirmation' }) }),
});
export type SendMatchInput = z.infer<typeof sendMatchSchema>;

export const introductionFormSchema = sendMatchSchema.pick({ introduction: true });

export const matchFeedbackSchema = z.object({
  status: z.enum(MATCH_STATUSES),
  note: z.string().trim().max(500).optional(),
});
export type MatchFeedbackInput = z.infer<typeof matchFeedbackSchema>;

export const matchListQuerySchema = z.object({
  customerId: z.string().max(64).optional(),
  status: z.enum(MATCH_STATUSES).optional(),
  page,
  pageSize: pageSize(100, 20),
});

export const activityQuerySchema = z.object({
  customerId: z.string().max(64).optional(),
  page,
  pageSize: pageSize(100, 25),
});

export const candidateListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  gender: z.enum(GENDERS).optional(),
  city: z.string().trim().max(60).optional(),
  verification: z.enum(VERIFICATION_STATUSES).optional(),
  page,
  pageSize: pageSize(100, 20),
});

export const outboxQuerySchema = z.object({
  page,
  pageSize: pageSize(100, 20),
});
