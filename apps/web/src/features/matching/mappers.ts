import type { CandidateEvaluation, CandidateSummary } from '@tdc/shared';

/** Full candidate profile → the compact summary used by cards and the send modal. */
export function toSummary(c: CandidateEvaluation['candidate']): CandidateSummary {
  return {
    id: c.id,
    kind: c.kind,
    firstName: c.firstName,
    lastName: c.lastName,
    age: c.age,
    gender: c.gender,
    city: c.city,
    country: c.country,
    heightCm: c.heightCm,
    profession: c.career.profession,
    professionCategory: c.career.professionCategory,
    designation: c.career.designation,
    company: c.career.company,
    educationDegree: c.education.degree,
    maritalStatus: c.background.maritalStatus,
    verificationStatus: c.verification.status,
  };
}
