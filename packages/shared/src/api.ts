import type {
  ActivityType,
  Gender,
  JourneyStatus,
  MaritalStatus,
  MatchStatus,
  MatchmakerRole,
  MembershipTier,
  NoteType,
  ProfessionCategory,
  SuggestionDecision,
  VerificationStatus,
} from './enums';
import type { MatchBreakdown, RankingSummary, ScoreBand } from './matching';
import type { Profile } from './profile';

/** Every successful response is wrapped as `{ data, meta? }`. */
export interface ApiSuccess<T> {
  data: T;
  meta?: PageMeta;
}

/** Every error response is wrapped as `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MatchmakerPublic {
  id: string;
  name: string;
  email: string;
  username: string;
  role: MatchmakerRole;
  title: string;
}

export interface SessionInfo {
  user: MatchmakerPublic;
  expiresAt: string;
}

export interface SystemInfo {
  status: 'ok';
  dataStore: 'mongo' | 'file' | 'memory';
  persistent: boolean;
  fallbackReason: string | null;
  aiEnabled: boolean;
  aiModel: string | null;
  emailProvider: 'mock';
  matching: { assignmentRulesEnabled: boolean; minScore: number; engineVersion: string };
  environment: string;
  uptimeSeconds: number;
}

export interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: Gender | null;
  city: string | null;
  profession: string | null;
  maritalStatus: MaritalStatus | null;
  verificationStatus: VerificationStatus;
  journeyStatus: JourneyStatus;
  membershipTier: MembershipTier;
  lastContactedAt: string | null;
  ownerId: string;
  ownerName: string | null;
  matchesSent: number;
}

export interface CustomerDetail extends Profile {
  age: number | null;
  owner: Pick<MatchmakerPublic, 'id' | 'name' | 'title'> | null;
  stats: {
    matchesSent: number;
    activeMatches: number;
    meetingsScheduled: number;
    shortlisted: number;
    dismissed: number;
  };
}

/** Candidate view used in suggestions. Contact details are deliberately omitted. */
export interface CandidateSummary {
  id: string;
  kind: Profile['kind'];
  firstName: string;
  lastName: string;
  age: number | null;
  gender: Gender | null;
  city: string | null;
  country: string | null;
  heightCm: number | null;
  profession: string | null;
  professionCategory: ProfessionCategory | null;
  designation: string | null;
  company: string | null;
  educationDegree: string | null;
  maritalStatus: MaritalStatus | null;
  verificationStatus: VerificationStatus;
}

/** Full candidate profile for matchmakers, with contact details removed. */
export type CandidateProfile = Omit<Profile, 'contact' | 'matchmaking'> & { age: number | null };

export interface Recommendation {
  candidate: CandidateSummary;
  breakdown: MatchBreakdown;
  decision: SuggestionDecision | null;
}

export interface RecommendationsResponse {
  customer: CandidateSummary;
  summary: RankingSummary;
  recommendations: Recommendation[];
  shortlisted: Recommendation[];
  dismissed: { candidate: CandidateSummary; reason: string | null; decidedAt: string }[];
  config: {
    minScore: number;
    weightProfile: string;
    weights: Record<string, number>;
    assignmentRulesEnabled: boolean;
    bands: { band: ScoreBand; label: string; min: number }[];
  };
}

export interface CandidateEvaluation {
  candidate: CandidateProfile;
  eligibility: {
    eligible: boolean;
    reasons: { code: string; detail: string }[];
    warnings: string[];
  };
  breakdown: MatchBreakdown;
  decision: SuggestionDecision | null;
  alreadySent: MatchRecord | null;
}

export interface AiExplanation {
  source: 'ai' | 'fallback';
  model: string | null;
  summary: string;
  highlights: string[];
  considerations: string[];
  fallbackReason: string | null;
}

export interface IntroductionDraft {
  source: 'ai' | 'fallback';
  model: string | null;
  subject: string;
  body: string;
  fallbackReason: string | null;
}

export interface Note {
  id: string;
  customerId: string;
  authorId: string;
  authorName: string | null;
  type: NoteType;
  body: string;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchStatusChange {
  status: MatchStatus;
  at: string;
  byId: string;
  byName: string | null;
  note: string | null;
}

export interface MatchRecord {
  id: string;
  customerId: string;
  candidateId: string;
  matchmakerId: string;
  matchmakerName: string | null;
  status: MatchStatus;
  score: number;
  band: ScoreBand;
  introduction: string;
  introductionSource: 'ai' | 'fallback' | 'edited';
  emailIds: string[];
  sentAt: string;
  updatedAt: string;
  statusHistory: MatchStatusChange[];
  customer?: CandidateSummary;
  candidate?: CandidateSummary;
}

export interface Activity {
  id: string;
  type: ActivityType;
  customerId: string | null;
  customerName: string | null;
  actorId: string;
  actorName: string | null;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface OutboxEmail {
  id: string;
  matchId: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
  provider: 'mock';
  /** Always true for the mock provider: no real email was delivered. */
  simulated: true;
  createdAt: string;
}

export interface DashboardData {
  totals: {
    assignedCustomers: number;
    verifiedCustomers: number;
    awaitingMatches: number;
    matchesSent: number;
    meetingsScheduled: number;
    activeConversations: number;
    candidatePool: number;
  };
  journeyDistribution: { status: JourneyStatus; count: number }[];
  matchStatusDistribution: { status: MatchStatus; count: number }[];
  needsAttention: CustomerListItem[];
  recentActivity: Activity[];
}
