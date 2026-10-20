import mongoose, { Schema } from 'mongoose';
import {
  ACTIVITY_TYPES,
  MATCHMAKER_ROLES,
  MATCH_STATUSES,
  NOTE_TYPES,
  SUGGESTION_DECISIONS,
} from '@tdc/shared';

const base = { versionKey: false, minimize: false } as const;

const matchmakerSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: MATCHMAKER_ROLES, required: true },
    title: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { ...base, collection: 'matchmakers' },
);

const noteSchema = new Schema(
  {
    _id: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    type: { type: String, enum: NOTE_TYPES, required: true },
    body: { type: String, required: true, maxlength: 2000 },
    contactedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { ...base, collection: 'notes' },
);

const statusChangeSchema = new Schema(
  {
    status: { type: String, enum: MATCH_STATUSES, required: true },
    at: { type: String, required: true },
    byId: { type: String, required: true },
    note: { type: String, default: null },
  },
  { _id: false },
);

const matchSchema = new Schema(
  {
    _id: { type: String, required: true },
    // Unique, order-independent pair key: the database itself rejects a duplicate introduction.
    pairKey: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    candidateId: { type: String, required: true, index: true },
    matchmakerId: { type: String, required: true },
    status: { type: String, enum: MATCH_STATUSES, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    band: { type: String, required: true },
    introduction: { type: String, required: true, maxlength: 1500 },
    introductionSource: { type: String, enum: ['ai', 'fallback', 'edited'], required: true },
    emailIds: { type: [String], default: [] },
    sentAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
  },
  { ...base, collection: 'matches' },
);

const decisionSchema = new Schema(
  {
    _id: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    candidateId: { type: String, required: true },
    decision: { type: String, enum: SUGGESTION_DECISIONS, required: true },
    reason: { type: String, default: null },
    decidedById: { type: String, required: true },
    decidedAt: { type: String, required: true },
  },
  { ...base, collection: 'suggestion_decisions' },
);

const activitySchema = new Schema(
  {
    _id: { type: String, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    customerId: { type: String, default: null, index: true },
    actorId: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: String, required: true, index: true },
  },
  { ...base, collection: 'activities' },
);

const outboxSchema = new Schema(
  {
    _id: { type: String, required: true },
    matchId: { type: String, required: true, index: true },
    to: { type: String, required: true },
    toName: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    provider: { type: String, enum: ['mock'], required: true },
    createdAt: { type: String, required: true },
  },
  { ...base, collection: 'email_outbox' },
);

const model = (name: string, schema: Schema) => mongoose.models[name] ?? mongoose.model(name, schema);

export const MatchmakerModel = model('Matchmaker', matchmakerSchema);
export const NoteModel = model('Note', noteSchema);
export const MatchModel = model('Match', matchSchema);
export const DecisionModel = model('SuggestionDecision', decisionSchema);
export const ActivityModel = model('Activity', activitySchema);
export const OutboxModel = model('OutboxEmail', outboxSchema);
