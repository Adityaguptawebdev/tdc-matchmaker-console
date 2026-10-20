import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MatchBreakdown } from '@tdc/shared';
import { createApp } from '../app';
import { seedDatabase } from '../seed';
import { DEMO_PASSWORD } from '../seed/matchmakers';
import {
  generateIntroduction,
  generateMatchExplanation,
  setAiClient,
  type ChatClient,
} from '../services/ai.service';
import { createMemoryStore } from '../store/memoryStore';
import type { Store } from '../store/types';

/**
 * HTTP-level integration tests against the real Express app with an in-memory store (explicitly
 * non-persistent) seeded with the demo dataset. No OpenAI key is configured (see vitest.config.ts).
 */
let server: Server;
let base: string;
let store: Store;
const tokens: Record<string, string> = {};

async function api(path: string, init: RequestInit & { as?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.as) headers.set('authorization', `Bearer ${tokens[init.as]}`);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  const res = await fetch(`${base}/api${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

beforeAll(async () => {
  store = createMemoryStore();
  await seedDatabase(store);
  server = createApp(store).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const user of ['ananya', 'rohan', 'priya']) {
    const res = await api('/auth/login', {
      method: 'POST',
      json: { identifier: user, password: DEMO_PASSWORD },
    });
    tokens[user] = res.body.data.token;
  }
});

afterAll(() => {
  server?.close();
  setAiClient(null);
});

describe('health & auth', () => {
  it('reports the store honestly (memory store is not persistent) and AI disabled without a key', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      dataStore: 'memory',
      persistent: false,
      aiEnabled: false,
      emailProvider: 'mock',
    });
  });

  it('rejects protected routes without a session', async () => {
    expect((await api('/customers')).status).toBe(401);
    expect((await api('/customers', { headers: { authorization: 'Bearer not-a-jwt' } })).status).toBe(401);
  });

  it('returns a generic error for wrong credentials and validates input', async () => {
    const wrong = await api('/auth/login', {
      method: 'POST',
      json: { identifier: 'ananya', password: 'nope' },
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    const unknown = await api('/auth/login', {
      method: 'POST',
      json: { identifier: 'nobody', password: 'nope' },
    });
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
    const invalid = await api('/auth/login', { method: 'POST', json: { identifier: 'a' } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details.fieldErrors.password).toBeDefined();
  });

  it('sets an httpOnly session cookie and never returns password hashes', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      json: { identifier: 'ananya.rao@tdc.example', password: DEMO_PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/tdc_session=.*HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('customers', () => {
  it('lists only the matchmaker’s own customers with pagination', async () => {
    const res = await api('/customers?pageSize=4&sort=name&order=asc', { as: 'ananya' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 4, total: 10, totalPages: 3 });
    expect(res.body.data.every((c: { ownerId: string }) => c.ownerId === 'mm_ananya')).toBe(true);
  });

  it('searches by name, city and profession and filters by enums', async () => {
    const byProfession = await api('/customers?search=doctor', { as: 'ananya' });
    expect(byProfession.body.data.map((c: { firstName: string }) => c.firstName).sort()).toEqual([
      'Farhan',
      'Kavya',
    ]);
    const byCity = await api('/customers?search=pune', { as: 'ananya' });
    expect(byCity.body.data[0].firstName).toBe('Rahul');
    const filtered = await api('/customers?gender=female&verification=verified', { as: 'ananya' });
    expect(
      filtered.body.data.every(
        (c: { gender: string; verificationStatus: string }) =>
          c.gender === 'female' && c.verificationStatus === 'verified',
      ),
    ).toBe(true);
    expect((await api('/customers?journeyStatus=bogus', { as: 'ananya' })).status).toBe(400);
  });

  it('computes age from date of birth and hides other matchmakers’ customers', async () => {
    const own = await api('/customers/cli_01', { as: 'ananya' });
    expect(own.body.data.age).toBeGreaterThanOrEqual(32);
    expect((await api('/customers/cli_11', { as: 'ananya' })).status).toBe(404);
    expect((await api('/customers/cli_11', { as: 'priya' })).status).toBe(200); // lead sees all
  });

  it('updates journey status and records it in the activity timeline', async () => {
    const res = await api('/customers/cli_07', {
      method: 'PATCH',
      as: 'ananya',
      json: { journeyStatus: 'awaiting_matches' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.matchmaking.journeyStatus).toBe('awaiting_matches');
    const activity = await api('/activity?customerId=cli_07', { as: 'ananya' });
    expect(activity.body.data[0].type).toBe('journey_status_changed');
  });
});

describe('notes', () => {
  it('creates, persists, edits and deletes notes, updating last-contacted', async () => {
    const created = await api('/customers/cli_05/notes', {
      method: 'POST',
      as: 'ananya',
      json: { type: 'call', body: 'Collected ID documents for verification.', markContacted: true },
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const list = await api('/customers/cli_05/notes', { as: 'ananya' });
    expect(list.body.data[0].id).toBe(id);
    const customer = await api('/customers/cli_05', { as: 'ananya' });
    expect(customer.body.data.matchmaking.lastContactedAt).toBe(created.body.data.contactedAt);

    const edited = await api(`/customers/cli_05/notes/${id}`, {
      method: 'PATCH',
      as: 'ananya',
      json: { body: 'Collected and verified ID documents.' },
    });
    expect(edited.body.data.body).toBe('Collected and verified ID documents.');
    expect((await api(`/customers/cli_05/notes/${id}`, { method: 'DELETE', as: 'ananya' })).status).toBe(204);
    expect(
      (await api(`/customers/cli_05/notes/${id}`, { method: 'PATCH', as: 'ananya', json: { body: 'again' } }))
        .status,
    ).toBe(404);
  });

  it('validates note input', async () => {
    const res = await api('/customers/cli_05/notes', {
      method: 'POST',
      as: 'ananya',
      json: { type: 'gossip', body: '' },
    });
    expect(res.status).toBe(400);
  });
});

describe('recommendations', () => {
  it('returns ranked, opposite-gender, explainable suggestions for a male customer', async () => {
    const res = await api('/customers/cli_01/recommendations', { as: 'ananya' });
    expect(res.status).toBe(200);
    const { recommendations, summary, config } = res.body.data;
    expect(recommendations.length).toBeGreaterThan(5);
    expect(config.weightProfile).toBe('male_customer');
    const scores = recommendations.map((r: { breakdown: MatchBreakdown }) => r.breakdown.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    for (const r of recommendations) {
      expect(r.candidate.gender).toBe('female');
      expect(r.candidate.id).not.toBe('cli_01');
      expect(r.breakdown.score).toBeGreaterThanOrEqual(summary.minScore);
      expect(r.breakdown.explanation.strengths.length).toBeGreaterThan(0);
      expect(r.candidate).not.toHaveProperty('contact');
    }
    // Seeded history: two introductions and one dismissal are excluded, not shown again.
    expect(summary.excludedByReason.ALREADY_SENT).toBe(2);
    expect(summary.excludedByReason.DISMISSED_BY_MATCHMAKER).toBe(1);
  });

  it('returns male suggestions for a female customer using the female weight profile', async () => {
    const res = await api('/customers/cli_02/recommendations', { as: 'ananya' });
    expect(res.body.data.config.weightProfile).toBe('female_customer');
    expect(
      res.body.data.recommendations.every(
        (r: { candidate: { gender: string } }) => r.candidate.gender === 'male',
      ),
    ).toBe(true);
  });

  it('gives different, data-driven suggestions to different customers', async () => {
    const a = await api('/customers/cli_01/recommendations?limit=5', { as: 'ananya' });
    const b = await api('/customers/cli_05/recommendations?limit=5', { as: 'ananya' });
    const ids = (r: typeof a) =>
      r.body.data.recommendations.map((x: { candidate: { id: string } }) => x.candidate.id).join();
    expect(ids(a)).not.toBe(ids(b));
  });

  it('applies UI filters without changing scores', async () => {
    const all = await api('/customers/cli_01/recommendations?limit=100', { as: 'ananya' });
    const filtered = await api(
      '/customers/cli_01/recommendations?limit=100&verifiedOnly=true&minAge=27&maxAge=31',
      { as: 'ananya' },
    );
    const scoreOf = new Map(
      all.body.data.recommendations.map((r: { candidate: { id: string }; breakdown: { score: number } }) => [
        r.candidate.id,
        r.breakdown.score,
      ]),
    );
    for (const r of filtered.body.data.recommendations) {
      expect(r.candidate.verificationStatus).toBe('verified');
      expect(r.candidate.age).toBeGreaterThanOrEqual(27);
      expect(r.candidate.age).toBeLessThanOrEqual(31);
      expect(r.breakdown.score).toBe(scoreOf.get(r.candidate.id));
    }
  });

  it('explains an ineligible pair instead of hiding the reason', async () => {
    const res = await api('/customers/cli_02/recommendations/cli_06', { as: 'ananya' });
    expect(res.body.data.eligibility.eligible).toBe(false);
    expect(res.body.data.eligibility.reasons.map((r: { code: string }) => r.code)).toContain('GENDER_RULE');
  });

  it('labels the explanation as a deterministic fallback when no AI key is configured', async () => {
    const recs = await api('/customers/cli_09/recommendations?limit=1', { as: 'ananya' });
    const candidateId = recs.body.data.recommendations[0].candidate.id;
    const res = await api(`/customers/cli_09/recommendations/${candidateId}/explanation`, {
      method: 'POST',
      as: 'ananya',
    });
    expect(res.body.data.source).toBe('fallback');
    expect(res.body.data.fallbackReason).toMatch(/OPENAI_API_KEY/);
    expect(res.body.data.highlights).toEqual(
      recs.body.data.recommendations[0].breakdown.explanation.strengths.slice(0, 4),
    );
  });

  it('dismissing a suggestion excludes it; restoring brings it back', async () => {
    const before = await api('/customers/cli_09/recommendations?limit=100', { as: 'ananya' });
    const target = before.body.data.recommendations[2].candidate.id;
    await api(`/customers/cli_09/recommendations/${target}/decision`, {
      method: 'PUT',
      as: 'ananya',
      json: { decision: 'dismissed', reason: 'Not a fit' },
    });
    const after = await api('/customers/cli_09/recommendations?limit=100', { as: 'ananya' });
    expect(
      after.body.data.recommendations.some((r: { candidate: { id: string } }) => r.candidate.id === target),
    ).toBe(false);
    expect(after.body.data.dismissed[0].candidate.id).toBe(target);
    await api(`/customers/cli_09/recommendations/${target}/decision`, {
      method: 'PUT',
      as: 'ananya',
      json: { decision: 'none' },
    });
    const restored = await api('/customers/cli_09/recommendations?limit=100', { as: 'ananya' });
    expect(
      restored.body.data.recommendations.some(
        (r: { candidate: { id: string } }) => r.candidate.id === target,
      ),
    ).toBe(true);
  });
});

describe('send match flow', () => {
  let candidateId: string;
  let introduction: string;

  it('drafts an introduction with the deterministic template when AI is unavailable', async () => {
    const recs = await api('/customers/cli_06/recommendations?limit=1', { as: 'ananya' });
    candidateId = recs.body.data.recommendations[0].candidate.id;
    const res = await api('/matches/introduction', {
      method: 'POST',
      as: 'ananya',
      json: { customerId: 'cli_06', candidateId },
    });
    expect(res.body.data.source).toBe('fallback');
    expect(res.body.data.body).toContain('Dear Meera');
    introduction = res.body.data.body;
  });

  it('requires explicit confirmation', async () => {
    const res = await api('/matches', {
      method: 'POST',
      as: 'ananya',
      json: { customerId: 'cli_06', candidateId, introduction, introductionSource: 'fallback' },
    });
    expect(res.status).toBe(400);
  });

  it('sends once, records history, logs simulated emails and advances the journey', async () => {
    const payload = {
      customerId: 'cli_06',
      candidateId,
      introduction,
      introductionSource: 'fallback',
      confirm: true,
    };
    const [a, b] = await Promise.all([
      api('/matches', { method: 'POST', as: 'ananya', json: payload }),
      api('/matches', { method: 'POST', as: 'ananya', json: payload }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const sent = a.status === 201 ? a.body.data : b.body.data;
    expect(sent.status).toBe('pending');
    expect(sent.emailIds).toHaveLength(2);

    const again = await api('/matches', { method: 'POST', as: 'ananya', json: payload });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('DUPLICATE_MATCH');

    const outbox = await api('/outbox', { as: 'ananya' });
    expect(
      outbox.body.data
        .filter((e: { matchId: string }) => e.matchId === sent.id)
        .every((e: { simulated: boolean }) => e.simulated),
    ).toBe(true);
    const customer = await api('/customers/cli_06', { as: 'ananya' });
    expect(customer.body.data.matchmaking.journeyStatus).toBe('matches_sent');
    const recs = await api('/customers/cli_06/recommendations?limit=100', { as: 'ananya' });
    expect(
      recs.body.data.recommendations.some(
        (r: { candidate: { id: string } }) => r.candidate.id === candidateId,
      ),
    ).toBe(false);
  });

  it('records feedback with status history and enforces ownership', async () => {
    const list = await api('/matches?customerId=cli_06', { as: 'ananya' });
    const id = list.body.data[0].id;
    const res = await api(`/matches/${id}`, {
      method: 'PATCH',
      as: 'ananya',
      json: { status: 'interested', note: 'Keen to talk' },
    });
    expect(res.body.data.status).toBe('interested');
    expect(res.body.data.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      'pending',
      'interested',
    ]);
    expect(
      (await api(`/matches/${id}`, { method: 'PATCH', as: 'rohan', json: { status: 'rejected' } })).status,
    ).toBe(404);
    expect(
      (await api(`/matches/${id}`, { method: 'PATCH', as: 'ananya', json: { status: 'married' } })).status,
    ).toBe(400);
  });

  it('refuses to send an ineligible pair', async () => {
    const res = await api('/matches', {
      method: 'POST',
      as: 'ananya',
      json: {
        customerId: 'cli_02',
        candidateId: 'cli_06',
        introduction: 'x'.repeat(60),
        introductionSource: 'edited',
        confirm: true,
      },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_ELIGIBLE');
  });
});

describe('dashboard', () => {
  it('reflects live metrics for the signed-in matchmaker', async () => {
    const res = await api('/dashboard', { as: 'ananya' });
    expect(res.body.data.totals.assignedCustomers).toBe(10);
    expect(res.body.data.totals.candidatePool).toBeGreaterThan(100);
    expect(
      res.body.data.journeyDistribution.reduce((a: number, x: { count: number }) => a + x.count, 0),
    ).toBe(10);
    expect(res.body.data.recentActivity.length).toBeGreaterThan(0);
  });
});

describe('AI layer (fake client)', () => {
  const fakeClient = (content: string | Error): ChatClient => ({
    chat: {
      completions: {
        create: (async () => {
          if (content instanceof Error) throw content;
          return { choices: [{ message: { content, refusal: null } }] };
        }) as unknown as ChatClient['chat']['completions']['create'],
      },
    },
  });

  async function pair() {
    const customer = (await store.profiles.findById('cli_01'))!;
    const recs = await api('/customers/cli_01/recommendations?limit=1', { as: 'ananya' });
    const candidate = (await store.profiles.findById(recs.body.data.recommendations[0].candidate.id))!;
    return { customer, candidate, breakdown: recs.body.data.recommendations[0].breakdown as MatchBreakdown };
  }

  it('accepts valid structured output that cites supplied facts', async () => {
    const { customer, candidate, breakdown } = await pair();
    setAiClient(
      fakeClient(
        JSON.stringify({
          summary: 'A well-aligned pair on family plans.',
          highlights: [{ factId: 'F1', text: 'They agree on children.' }],
          considerations: [],
        }),
      ),
    );
    const res = await generateMatchExplanation(customer, candidate, breakdown);
    expect(res.source).toBe('ai');
    expect(res.highlights).toEqual(['They agree on children.']);
  });

  it('falls back when the model cites a fact that was not supplied', async () => {
    const { customer, candidate, breakdown } = await pair();
    setAiClient(
      fakeClient(
        JSON.stringify({
          summary: 'Great pair.',
          highlights: [{ factId: 'F99', text: 'Both love salsa.' }],
          considerations: [],
        }),
      ),
    );
    expect((await generateMatchExplanation(customer, candidate, breakdown)).source).toBe('fallback');
  });

  it('falls back on invalid JSON, timeouts and contact details in drafts', async () => {
    const { customer, candidate, breakdown } = await pair();
    setAiClient(fakeClient('not json'));
    expect((await generateMatchExplanation(customer, candidate, breakdown)).source).toBe('fallback');
    setAiClient(fakeClient(new Error('Request timed out')));
    expect(
      (await generateIntroduction(customer, candidate, { breakdown, matchmakerName: 'Ananya Rao' })).source,
    ).toBe('fallback');
    setAiClient(
      fakeClient(
        JSON.stringify({
          subject: 'Meet someone',
          body: `Dear Arjun, meet ${candidate.firstName}. Call her on +91 98765 43210. ${'Lovely person. '.repeat(6)}`,
        }),
      ),
    );
    expect(
      (await generateIntroduction(customer, candidate, { breakdown, matchmakerName: 'Ananya Rao' })).source,
    ).toBe('fallback');
    setAiClient(null);
  });
});
