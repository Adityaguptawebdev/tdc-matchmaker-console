import type { IntroductionDraft, MatchFeedbackInput, MatchRecord, SendMatchInput } from '@tdc/shared';
import { MATCH_STATUS_LABELS, computeAge, fullName } from '@tdc/shared';
import { AppError, conflict, notFound, paginate } from '../lib/http';
import { newId, nowIso, pairKey } from '../lib/ids';
import { toCandidateSummary } from '../lib/mappers';
import type { MatchEntity, MatchmakerEntity, Store } from '../store/types';
import { DuplicateKeyError } from '../store/types';
import { customerScope, getAccessibleCustomer, matchmakerMap } from './access';
import { logActivity } from './activity.service';
import { generateIntroduction } from './ai.service';
import { advanceJourney } from './customer.service';
import { createMockEmailProvider } from './email.service';
import { evaluatePair, getCandidateForCustomer } from './matching.service';

export async function hydrateMatches(store: Store, matches: MatchEntity[]): Promise<MatchRecord[]> {
  if (matches.length === 0) return [];
  const owners = await matchmakerMap(store);
  const ids = [...new Set(matches.flatMap((m) => [m.customerId, m.candidateId]))];
  const profiles = new Map((await store.profiles.find({ id: { $in: ids } })).map((p) => [p.id, p]));
  const now = new Date();
  return matches.map((m) => {
    const customer = profiles.get(m.customerId);
    const candidate = profiles.get(m.candidateId);
    return {
      ...m,
      matchmakerName: owners.get(m.matchmakerId)?.name ?? null,
      statusHistory: m.statusHistory.map((h) => ({ ...h, byName: owners.get(h.byId)?.name ?? null })),
      customer: customer ? toCandidateSummary(customer, now) : undefined,
      candidate: candidate ? toCandidateSummary(candidate, now) : undefined,
    };
  });
}

export async function draftIntroduction(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  candidateId: string,
): Promise<IntroductionDraft> {
  const customer = await getAccessibleCustomer(store, user, customerId);
  const candidate = await getCandidateForCustomer(store, customer, candidateId);
  const { breakdown } = await evaluatePair(store, customer, candidate);
  return generateIntroduction(customer, candidate, { breakdown, matchmakerName: user.name });
}

/** In-process guard against double-clicks / concurrent sends; Mongo's unique pairKey index covers multi-instance. */
const inFlight = new Set<string>();

export async function sendMatch(
  store: Store,
  user: MatchmakerEntity,
  input: SendMatchInput,
): Promise<MatchRecord> {
  const customer = await getAccessibleCustomer(store, user, input.customerId);
  const candidate = await getCandidateForCustomer(store, customer, input.candidateId);
  const key = pairKey(customer.id, candidate.id);
  if (inFlight.has(key))
    throw conflict('This introduction is already being sent.', { code: 'SEND_IN_PROGRESS' });
  inFlight.add(key);

  try {
    const { eligibility, breakdown, existingMatch } = await evaluatePair(store, customer, candidate);
    if (existingMatch) {
      throw new AppError(
        409,
        'DUPLICATE_MATCH',
        `${candidate.firstName} has already been introduced to ${customer.firstName}.`,
        {
          matchId: existingMatch.id,
        },
      );
    }
    if (!eligibility.eligible) {
      throw new AppError(
        422,
        'NOT_ELIGIBLE',
        'This candidate does not meet the eligibility rules for this customer.',
        {
          reasons: eligibility.reasons,
        },
      );
    }

    const now = nowIso();
    let match: MatchEntity;
    try {
      match = await store.matches.insert({
        id: newId('match'),
        pairKey: key,
        customerId: customer.id,
        candidateId: candidate.id,
        matchmakerId: user.id,
        status: 'pending',
        score: breakdown.score,
        band: breakdown.band,
        introduction: input.introduction,
        introductionSource: input.introductionSource,
        emailIds: [],
        sentAt: now,
        updatedAt: now,
        statusHistory: [{ status: 'pending', at: now, byId: user.id, note: 'Introduction sent' }],
      });
    } catch (err) {
      if (err instanceof DuplicateKeyError)
        throw new AppError(409, 'DUPLICATE_MATCH', 'This pair has already been introduced.');
      throw err;
    }

    const mailer = createMockEmailProvider(store);
    const age = computeAge(customer.dateOfBirth);
    const emails = [];
    if (customer.contact.email) {
      emails.push(
        await mailer.send({
          matchId: match.id,
          to: customer.contact.email,
          toName: fullName(customer),
          subject: `An introduction from TDC: meet ${candidate.firstName}`,
          body: input.introduction,
        }),
      );
    }
    if (candidate.contact.email) {
      emails.push(
        await mailer.send({
          matchId: match.id,
          to: candidate.contact.email,
          toName: fullName(candidate),
          subject: 'TDC has a potential match for you',
          body: [
            `Dear ${candidate.firstName},`,
            `Our matchmaker ${user.name} believes you may be a good match with ${customer.firstName}${age ? `, ${age}` : ''}${customer.city ? `, based in ${customer.city}` : ''}.`,
            `${user.name.split(' ')[0]} will be in touch shortly to share more and hear what you think.`,
            `Warm regards,\nTDC Matchmaking`,
          ].join('\n\n'),
        }),
      );
    }
    match = (await store.matches.update(match.id, { emailIds: emails.map((e) => e.id) }))!;

    await logActivity(store, {
      type: 'match_sent',
      actorId: user.id,
      customerId: customer.id,
      message: `Introduced ${fullName(candidate)} to ${fullName(customer)} (score ${breakdown.score}) — simulated email`,
      meta: { matchId: match.id, candidateId: candidate.id, score: breakdown.score },
    });
    await advanceJourney(store, customer, user.id, 'matches_sent', true);
    return (await hydrateMatches(store, [match]))[0]!;
  } finally {
    inFlight.delete(key);
  }
}

export async function listMatches(
  store: Store,
  user: MatchmakerEntity,
  q: { customerId?: string; status?: MatchEntity['status']; page: number; pageSize: number },
) {
  let customerIds: string[];
  if (q.customerId) {
    await getAccessibleCustomer(store, user, q.customerId);
    customerIds = [q.customerId];
  } else {
    customerIds = (await store.profiles.find(customerScope(user))).map((c) => c.id);
  }
  if (customerIds.length === 0) return paginate<MatchRecord>([], q.page, q.pageSize);
  const filter = { customerId: { $in: customerIds }, ...(q.status ? { status: q.status } : {}) };
  const all = await store.matches.find(filter, { sort: { sentAt: -1 } });
  const { items, meta } = paginate(all, q.page, q.pageSize);
  return { items: await hydrateMatches(store, items), meta };
}

export async function updateMatchStatus(
  store: Store,
  user: MatchmakerEntity,
  matchId: string,
  input: MatchFeedbackInput,
): Promise<MatchRecord> {
  const match = await store.matches.findById(matchId);
  if (!match) throw notFound('Match');
  const customer = await getAccessibleCustomer(store, user, match.customerId);
  if (match.status === input.status && !input.note) return (await hydrateMatches(store, [match]))[0]!;

  const now = nowIso();
  const updated = await store.matches.update(matchId, {
    status: input.status,
    updatedAt: now,
    statusHistory: [
      ...match.statusHistory,
      { status: input.status, at: now, byId: user.id, note: input.note?.trim() || null },
    ],
  });
  const candidate = await store.profiles.findById(match.candidateId);
  await logActivity(store, {
    type: 'match_feedback',
    actorId: user.id,
    customerId: match.customerId,
    message: `Match with ${candidate ? fullName(candidate) : 'candidate'} marked ${MATCH_STATUS_LABELS[input.status]}${input.note ? `: "${input.note.trim()}"` : ''}`,
    meta: { matchId, from: match.status, to: input.status },
  });
  if (input.status === 'meeting_scheduled')
    await advanceJourney(store, customer, user.id, 'meeting_scheduled', false);
  return (await hydrateMatches(store, [updated!]))[0]!;
}
