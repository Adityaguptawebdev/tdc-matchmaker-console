import { rankCandidates } from '@tdc/matching-engine';
import type { MatchStatus, NoteType, Profile } from '@tdc/shared';
import { MATCH_STATUS_LABELS, NOTE_TYPE_LABELS, fullName } from '@tdc/shared';
import { pairKey } from '../lib/ids';
import { fallbackIntroduction } from '../services/ai.service';
import { matchingConfig } from '../services/matching.service';
import type { ActivityEntity, DecisionEntity, MatchEntity, NoteEntity, OutboxEntity } from '../store/types';
import { DEMO_USERS } from './matchmakers';

type NoteSeed = { type: NoteType; daysAgo: number; body: string };

const NOTES: Record<string, NoteSeed[]> = {
  cli_01: [
    {
      type: 'meeting',
      daysAgo: 70,
      body: 'Onboarding meeting at the Indiranagar office. Arjun is clear he wants to marry within a year and start a family soon after. Open to Mumbai/Pune if the right person is there.',
    },
    {
      type: 'call',
      daysAgo: 12,
      body: 'Shared first introduction. He liked that she is also into trekking; asked for a short call before meeting in person.',
    },
    {
      type: 'call',
      daysAgo: 3,
      body: 'Follow-up call. First call went well — they are planning coffee this weekend. Sent a second profile for him to review as well.',
    },
  ],
  cli_02: [
    {
      type: 'meeting',
      daysAgo: 20,
      body: 'Video onboarding with Kavya and her mother. Strongly prefers someone who will settle in Chennai — her clinic plans are non-negotiable. Vegetarian household.',
    },
    {
      type: 'note',
      daysAgo: 6,
      body: 'Medical Council registration verified. Ready for first suggestions; prioritise Chennai/Bengaluru doctors and engineers.',
    },
  ],
  cli_03: [
    {
      type: 'meeting',
      daysAgo: 115,
      body: 'Initial consultation. Rahul is candid about his divorce; wants someone mature and comfortable with a joint family and his dog.',
    },
    {
      type: 'feedback',
      daysAgo: 20,
      body: 'Not interested in the second introduction — felt the lifestyle gap was too wide.',
    },
    {
      type: 'call',
      daysAgo: 1,
      body: 'Confirmed in-person meeting for Saturday at a café in Koregaon Park. Both families aware.',
    },
  ],
  cli_04: [
    {
      type: 'meeting',
      daysAgo: 150,
      body: 'Onboarding over lunch. Sneha wants an equal partner who is excited about a possible move abroad. Children: undecided.',
    },
    {
      type: 'feedback',
      daysAgo: 40,
      body: 'Declined one introduction: felt he expected her to scale back her career.',
    },
    {
      type: 'call',
      daysAgo: 9,
      body: 'Two conversations progressing; she wants to take it slow and meet one person at a time.',
    },
  ],
  cli_05: [
    {
      type: 'call',
      daysAgo: 2,
      body: 'Intro call. Vikram is keen to move quickly; family is involved. ID verification pending — documents requested.',
    },
  ],
  cli_06: [
    {
      type: 'meeting',
      daysAgo: 44,
      body: 'Onboarding. Meera is clear she does not want children; asked us to only consider men who are certain about the same. Has two cats.',
    },
    {
      type: 'note',
      daysAgo: 19,
      body: 'Pool for child-free partners is thin. Expanding search to other cities; she is open to relocating for the right person.',
    },
  ],
  cli_07: [
    {
      type: 'call',
      daysAgo: 60,
      body: 'Kabir found the first introduction pleasant but is not ready yet. Agreed to pause for a couple of months.',
    },
    { type: 'note', daysAgo: 34, body: 'Placed on hold at his request. Check in again in November.' },
  ],
  cli_09: [
    {
      type: 'meeting',
      daysAgo: 30,
      body: 'Onboarding in Lucknow. Farhan is open to relocating for work; prefers a partner who shares his faith and is family-oriented.',
    },
    {
      type: 'call',
      daysAgo: 12,
      body: 'Discussed shortlist criteria; he is flexible on profession but wants someone who does not smoke.',
    },
  ],
  cli_10: [
    {
      type: 'meeting',
      daysAgo: 55,
      body: 'Onboarding at her studio. Vegetarian, does not drink; would happily relocate to Delhi, Ahmedabad or Mumbai.',
    },
    {
      type: 'call',
      daysAgo: 5,
      body: 'Sent first introduction; she will review over the weekend with her parents.',
    },
  ],
  cli_11: [
    {
      type: 'meeting',
      daysAgo: 60,
      body: 'Onboarding. Nikhil wants a vegetarian partner and values intellectual curiosity.',
    },
    {
      type: 'call',
      daysAgo: 4,
      body: 'Introduced a new profile; he is positive about the earlier match too.',
    },
  ],
  cli_12: [
    {
      type: 'meeting',
      daysAgo: 26,
      body: 'Onboarding. Simran needs a partner flexible about moving with her postings.',
    },
  ],
  cli_13: [{ type: 'call', daysAgo: 7, body: 'Meeting confirmed for next Friday in Bandra.' }],
  cli_14: [
    {
      type: 'note',
      daysAgo: 22,
      body: 'Tanvi and her match have confirmed their engagement. Closing the journey as Matched.',
    },
  ],
};

type MatchSeed = { rank: number; status: MatchStatus; daysAgo: number; via?: MatchStatus[] };

const MATCHES: Record<string, MatchSeed[]> = {
  cli_01: [
    { rank: 2, status: 'interested', daysAgo: 12 },
    { rank: 4, status: 'pending', daysAgo: 3 },
  ],
  cli_03: [
    { rank: 1, status: 'meeting_scheduled', daysAgo: 10, via: ['interested'] },
    { rank: 3, status: 'not_interested', daysAgo: 22 },
  ],
  cli_04: [
    { rank: 1, status: 'interested', daysAgo: 25 },
    { rank: 2, status: 'meeting_scheduled', daysAgo: 15, via: ['interested'] },
    { rank: 5, status: 'rejected', daysAgo: 42 },
  ],
  cli_07: [{ rank: 1, status: 'not_interested', daysAgo: 62 }],
  cli_10: [{ rank: 2, status: 'pending', daysAgo: 5 }],
  cli_11: [
    { rank: 1, status: 'interested', daysAgo: 14 },
    { rank: 3, status: 'pending', daysAgo: 4 },
  ],
  cli_13: [{ rank: 1, status: 'meeting_scheduled', daysAgo: 8, via: ['interested'] }],
  cli_14: [
    { rank: 0, status: 'meeting_scheduled', daysAgo: 95, via: ['interested'] },
    { rank: 2, status: 'not_interested', daysAgo: 120 },
  ],
};

const DECISIONS: Record<
  string,
  { rank: number; decision: 'shortlisted' | 'dismissed'; reason: string | null; daysAgo: number }[]
> = {
  cli_01: [
    { rank: 1, decision: 'shortlisted', reason: null, daysAgo: 2 },
    {
      rank: 6,
      decision: 'dismissed',
      reason: 'Family prefers someone already based in Bengaluru.',
      daysAgo: 10,
    },
  ],
  cli_02: [{ rank: 0, decision: 'shortlisted', reason: null, daysAgo: 4 }],
  cli_06: [
    {
      rank: 2,
      decision: 'dismissed',
      reason: 'Meera asked to avoid people from her own industry.',
      daysAgo: 15,
    },
  ],
};

export interface SeedHistory {
  notes: NoteEntity[];
  matches: MatchEntity[];
  decisions: DecisionEntity[];
  activities: ActivityEntity[];
  outbox: OutboxEntity[];
}

export function buildHistory(clients: Profile[], pool: Profile[], now: Date): SeedHistory {
  const at = (daysAgo: number, hour = 10) => {
    const d = new Date(now.getTime() - daysAgo * 86_400_000);
    d.setUTCHours(hour, (daysAgo * 13) % 60, 0, 0);
    return d.toISOString();
  };
  const out: SeedHistory = { notes: [], matches: [], decisions: [], activities: [], outbox: [] };
  const activity = (
    id: string,
    a: Omit<ActivityEntity, 'id' | 'meta'> & { meta?: Record<string, unknown> },
  ) => out.activities.push({ id: `act_seed_${id}`, meta: {}, ...a });
  const usedPairs = new Set<string>();

  for (const client of clients) {
    const owner = DEMO_USERS.find((u) => u.id === client.matchmaking!.ownerId)!;

    (NOTES[client.id] ?? []).forEach((n, i) => {
      const ts = at(n.daysAgo, 9 + i);
      const id = `note_seed_${client.id}_${i + 1}`;
      out.notes.push({
        id,
        customerId: client.id,
        authorId: owner.id,
        type: n.type,
        body: n.body,
        contactedAt: n.type === 'call' || n.type === 'meeting' ? ts : null,
        createdAt: ts,
        updatedAt: ts,
      });
      activity(`${id}`, {
        type: 'note_added',
        actorId: owner.id,
        customerId: client.id,
        message: `${NOTE_TYPE_LABELS[n.type]} logged: "${n.body.length > 80 ? `${n.body.slice(0, 77)}…` : n.body}"`,
        createdAt: ts,
      });
    });

    const plans = MATCHES[client.id] ?? [];
    const decisions = DECISIONS[client.id] ?? [];
    if (plans.length === 0 && decisions.length === 0) continue;

    // Rank with the real engine, at the time the first introduction would have been made.
    const ranked = rankCandidates(client, pool, { now, config: matchingConfig }).recommended.filter(
      (r) => !usedPairs.has(pairKey(client.id, r.candidate.id)),
    );

    plans.forEach((plan, i) => {
      const pick = ranked[plan.rank];
      if (!pick) return;
      const { candidate, breakdown } = pick;
      usedPairs.add(pairKey(client.id, candidate.id));
      const id = `match_seed_${client.id}_${i + 1}`;
      const sentAt = at(plan.daysAgo, 12);
      const steps: MatchStatus[] = plan.status === 'pending' ? [] : [...(plan.via ?? []), plan.status];
      const history: MatchEntity['statusHistory'] = [
        { status: 'pending', at: sentAt, byId: owner.id, note: 'Introduction sent' },
      ];
      steps.forEach((s, k) => {
        const daysLater = Math.max(1, Math.round(((k + 1) * plan.daysAgo) / (steps.length + 2)));
        history.push({ status: s, at: at(plan.daysAgo - daysLater, 15), byId: owner.id, note: null });
      });
      const intro = fallbackIntroduction(client, candidate, breakdown, owner.name);
      const emailIds = [`email_seed_${client.id}_${i + 1}_a`, `email_seed_${client.id}_${i + 1}_b`];
      out.matches.push({
        id,
        pairKey: pairKey(client.id, candidate.id),
        customerId: client.id,
        candidateId: candidate.id,
        matchmakerId: owner.id,
        status: plan.status,
        score: breakdown.score,
        band: breakdown.band,
        introduction: intro.body,
        introductionSource: 'fallback',
        emailIds,
        sentAt,
        updatedAt: history[history.length - 1]!.at,
        statusHistory: history,
      });
      out.outbox.push(
        {
          id: emailIds[0]!,
          matchId: id,
          to: client.contact.email!,
          toName: fullName(client),
          subject: intro.subject,
          body: intro.body,
          provider: 'mock',
          createdAt: sentAt,
        },
        {
          id: emailIds[1]!,
          matchId: id,
          to: candidate.contact.email!,
          toName: fullName(candidate),
          subject: 'TDC has a potential match for you',
          body: `Dear ${candidate.firstName},\n\nOur matchmaker ${owner.name} believes you may be a good match with ${client.firstName}, based in ${client.city}.\n\n${owner.name.split(' ')[0]} will be in touch shortly to share more and hear what you think.\n\nWarm regards,\nTDC Matchmaking`,
          provider: 'mock',
          createdAt: sentAt,
        },
      );
      activity(`${id}_sent`, {
        type: 'match_sent',
        actorId: owner.id,
        customerId: client.id,
        message: `Introduced ${fullName(candidate)} to ${fullName(client)} (score ${breakdown.score}) — simulated email`,
        meta: { matchId: id, candidateId: candidate.id, score: breakdown.score },
        createdAt: sentAt,
      });
      history.slice(1).forEach((h, k) =>
        activity(`${id}_fb${k + 1}`, {
          type: 'match_feedback',
          actorId: owner.id,
          customerId: client.id,
          message: `Match with ${fullName(candidate)} marked ${MATCH_STATUS_LABELS[h.status]}`,
          meta: { matchId: id, to: h.status },
          createdAt: h.at,
        }),
      );
    });

    decisions.forEach((d, i) => {
      const pick = ranked[d.rank];
      if (!pick || usedPairs.has(pairKey(client.id, pick.candidate.id))) return;
      const ts = at(d.daysAgo, 16);
      out.decisions.push({
        id: `${client.id}__${pick.candidate.id}`,
        customerId: client.id,
        candidateId: pick.candidate.id,
        decision: d.decision,
        reason: d.reason,
        decidedById: owner.id,
        decidedAt: ts,
      });
      activity(`dec_${client.id}_${i + 1}`, {
        type: d.decision === 'shortlisted' ? 'suggestion_shortlisted' : 'suggestion_dismissed',
        actorId: owner.id,
        customerId: client.id,
        message:
          d.decision === 'shortlisted'
            ? `Shortlisted ${fullName(pick.candidate)}`
            : `Dismissed ${fullName(pick.candidate)} as not a fit: "${d.reason}"`,
        meta: { candidateId: pick.candidate.id },
        createdAt: ts,
      });
    });
  }

  activity('journey_cli_14', {
    type: 'journey_status_changed',
    actorId: 'mm_rohan',
    customerId: 'cli_14',
    message: 'Journey status changed from Meeting scheduled to Matched',
    meta: { from: 'meeting_scheduled', to: 'matched' },
    createdAt: at(22, 17),
  });
  return out;
}
