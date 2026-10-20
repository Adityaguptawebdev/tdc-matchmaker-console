import type {
  CandidateProfile,
  CandidateSummary,
  CustomerListItem,
  MatchmakerPublic,
  Profile,
} from '@tdc/shared';
import { computeAge } from '@tdc/shared';
import type { MatchmakerEntity } from '../store/types';

/** Never expose password hashes. */
export function toPublicMatchmaker(m: MatchmakerEntity): MatchmakerPublic {
  return { id: m.id, name: m.name, email: m.email, username: m.username, role: m.role, title: m.title };
}

export function toCandidateSummary(p: Profile, now = new Date()): CandidateSummary {
  return {
    id: p.id,
    kind: p.kind,
    firstName: p.firstName,
    lastName: p.lastName,
    age: computeAge(p.dateOfBirth, now),
    gender: p.gender,
    city: p.city,
    country: p.country,
    heightCm: p.heightCm,
    profession: p.career.profession,
    professionCategory: p.career.professionCategory,
    designation: p.career.designation,
    company: p.career.company,
    educationDegree: p.education.degree,
    maritalStatus: p.background.maritalStatus,
    verificationStatus: p.verification.status,
  };
}

/** Candidate profile for matchmakers: contact details and internal matchmaking data are stripped. */
export function toCandidateProfile(p: Profile, now = new Date()): CandidateProfile {
  const { contact: _contact, matchmaking: _matchmaking, ...rest } = p;
  return { ...rest, age: computeAge(p.dateOfBirth, now) };
}

export function toCustomerListItem(
  p: Profile,
  owners: Map<string, MatchmakerEntity>,
  matchesSent: number,
  now = new Date(),
): CustomerListItem {
  const mm = p.matchmaking!;
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    age: computeAge(p.dateOfBirth, now),
    gender: p.gender,
    city: p.city,
    profession: p.career.profession,
    maritalStatus: p.background.maritalStatus,
    verificationStatus: p.verification.status,
    journeyStatus: mm.journeyStatus,
    membershipTier: mm.membershipTier,
    lastContactedAt: mm.lastContactedAt,
    ownerId: mm.ownerId,
    ownerName: owners.get(mm.ownerId)?.name ?? null,
    matchesSent,
  };
}
