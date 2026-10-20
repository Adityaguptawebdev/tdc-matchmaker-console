import OpenAI from 'openai';
import { z } from 'zod';
import type { AiExplanation, IntroductionDraft, MatchBreakdown, Profile } from '@tdc/shared';
import { computeAge } from '@tdc/shared';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/**
 * Optional AI layer. The deterministic engine decides eligibility and scores; the model only rephrases
 * facts the engine already produced. Every AI response is schema-validated and checked against the
 * supplied fact ids — anything off-script falls back to the deterministic text.
 */

export interface ChatClient {
  chat: { completions: { create: OpenAI['chat']['completions']['create'] } };
}

let client: ChatClient | null = env.openai.apiKey
  ? new OpenAI({ apiKey: env.openai.apiKey, timeout: env.openai.timeoutMs, maxRetries: 1 })
  : null;

/** Test seam: inject a fake client (or null to simulate a missing key). */
export function setAiClient(next: ChatClient | null): void {
  client = next;
}

export const aiStatus = () => ({ enabled: client !== null, model: client ? env.openai.model : null });

interface Fact {
  id: string;
  kind: 'strength' | 'consideration' | 'unknown';
  text: string;
}

// Income figures are summarised as "earns more/less" for the model — exact amounts are not needed.
const MONEY_PARENS = /\s*\([^)]*(₹|USD|GBP|SGD|AED)[^)]*\)/g;
const redact = (text: string) => text.replace(MONEY_PARENS, '');
const CONTACT_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s-]{7,}\d/;

function collectFacts(b: MatchBreakdown): Fact[] {
  const facts: Fact[] = [];
  const push = (kind: Fact['kind'], texts: string[]) => {
    for (const text of texts) facts.push({ id: `F${facts.length + 1}`, kind, text: redact(text) });
  };
  push('strength', b.explanation.strengths);
  push('consideration', b.explanation.considerations);
  push('unknown', b.explanation.unknowns);
  return facts;
}

function publicSummary(p: Profile) {
  // Deliberately minimal: no contact details, surname, income, religion, caste or community.
  return {
    firstName: p.firstName,
    age: computeAge(p.dateOfBirth),
    city: p.city,
    profession: p.career.profession,
    designation: p.career.designation,
    education: p.education.degree,
    interests: p.lifestyle.interests.slice(0, 6),
  };
}

async function callJson(
  system: string,
  user: unknown,
  schemaName: string,
  jsonSchema: Record<string, unknown>,
): Promise<unknown> {
  if (!client) throw new Error('AI not configured');
  const completion = await client.chat.completions.create({
    model: env.openai.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema: jsonSchema },
    },
  });
  const message = completion.choices[0]?.message;
  if (!message?.content)
    throw new Error(message?.refusal ? 'Model refused the request' : 'Empty AI response');
  return JSON.parse(message.content);
}

const citedText = z.object({ factId: z.string().max(8), text: z.string().min(3).max(240) });
const explanationOutput = z.object({
  summary: z.string().min(10).max(420),
  highlights: z.array(citedText).max(4),
  considerations: z.array(citedText).max(3),
});

const EXPLANATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'highlights', 'considerations'],
  properties: {
    summary: { type: 'string', description: '1–2 sentences for the matchmaker.' },
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId', 'text'],
        properties: { factId: { type: 'string' }, text: { type: 'string' } },
      },
    },
    considerations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId', 'text'],
        properties: { factId: { type: 'string' }, text: { type: 'string' } },
      },
    },
  },
};

const EXPLANATION_SYSTEM = `You help a professional matchmaker understand why two people were suggested to each other.
Rewrite the supplied facts into a short, professional explanation.
Rules:
- Use ONLY the supplied facts. Never add interests, values, preferences, traits or details that are not in the facts.
- Every highlight and consideration must cite exactly one factId it restates. Highlights cite "strength" facts; considerations cite "consideration" or "unknown" facts.
- Do not mention numbers, scores, percentages or probabilities, and never imply a likelihood of relationship success.
- Do not speculate about religion, caste, community, appearance or health.
- Plain, warm, factual English. No internal reasoning.`;

function fallbackExplanation(b: MatchBreakdown, reason: string): AiExplanation {
  return {
    source: 'fallback',
    model: null,
    summary: b.explanation.headline,
    highlights: b.explanation.strengths.slice(0, 4),
    considerations: [...b.explanation.considerations, ...b.explanation.unknowns].slice(0, 3),
    fallbackReason: reason,
  };
}

export async function generateMatchExplanation(
  customer: Profile,
  candidate: Profile,
  breakdown: MatchBreakdown,
): Promise<AiExplanation> {
  if (!client)
    return fallbackExplanation(
      breakdown,
      'OPENAI_API_KEY is not configured — showing the deterministic explanation.',
    );
  const facts = collectFacts(breakdown);
  try {
    const raw = await callJson(
      EXPLANATION_SYSTEM,
      {
        customer: { firstName: customer.firstName },
        candidate: { firstName: candidate.firstName },
        compatibilityBand: breakdown.bandLabel,
        evidence: breakdown.confidence,
        facts,
      },
      'match_explanation',
      EXPLANATION_SCHEMA,
    );
    const out = explanationOutput.parse(raw);
    const ids = new Map(facts.map((f) => [f.id, f.kind]));
    const valid =
      out.highlights.every((h) => ids.get(h.factId) === 'strength') &&
      out.considerations.every((c) => ['consideration', 'unknown'].includes(ids.get(c.factId) ?? '')) &&
      !/%|\d+\s*\/\s*100/.test(out.summary);
    if (!valid) throw new Error('AI output cited unknown facts or mentioned scores');
    return {
      source: 'ai',
      model: env.openai.model,
      summary: out.summary,
      highlights: out.highlights.map((h) => h.text),
      considerations: out.considerations.map((c) => c.text),
      fallbackReason: null,
    };
  } catch (err) {
    logger.warn(`[ai] explanation fell back: ${(err as Error).message}`);
    return fallbackExplanation(
      breakdown,
      'The AI service was unavailable or returned invalid output — showing the deterministic explanation.',
    );
  }
}

const introductionOutput = z.object({
  subject: z.string().min(5).max(120),
  body: z.string().min(80).max(1500),
});

const INTRO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'body'],
  properties: { subject: { type: 'string' }, body: { type: 'string' } },
};

const INTRO_SYSTEM = `You draft short match-introduction emails from a TDC matchmaker to their client.
Rules:
- Address the client by first name and sign off with the matchmaker's name and "TDC Matchmaking".
- Introduce the candidate by FIRST NAME ONLY. Never include surnames, phone numbers, emails or addresses.
- Use only the supplied candidate summary and shared facts. Do not invent interests, values or traits.
- Do not mention scores, percentages or the likelihood of success.
- 90–170 words, warm and professional, plain text with short paragraphs.`;

function introFacts(b: MatchBreakdown): string[] {
  const mutual = b.categories
    .flatMap((c) => c.checks.map((check) => ({ check, impact: c.weight * check.weight })))
    .filter((x) => x.check.direction === 'mutual' && x.check.outcome === 'match')
    .sort((x, y) => y.impact - x.impact)
    .map((x) => redact(x.check.detail));
  return (mutual.length >= 2 ? mutual : [...mutual, ...b.explanation.strengths.map(redact)]).slice(0, 3);
}

export function fallbackIntroduction(
  customer: Profile,
  candidate: Profile,
  breakdown: MatchBreakdown,
  matchmakerName: string,
) {
  const age = computeAge(candidate.dateOfBirth);
  const role = candidate.career.designation ?? candidate.career.profession;
  // Job titles are kept as written (e.g. "IRS Officer"), never lower-cased.
  const descriptor = [
    age ? `${age}` : null,
    role ? `${role}${candidate.career.company ? ` at ${candidate.career.company}` : ''}` : null,
    candidate.city ? `based in ${candidate.city}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const bullets = introFacts(breakdown).map((f) => `• ${f}`);
  const body = [
    `Dear ${customer.firstName},`,
    `I would like to introduce you to ${candidate.firstName}${descriptor ? ` — ${descriptor}` : ''}.`,
    bullets.length ? `A few reasons I think you two should talk:\n${bullets.join('\n')}` : null,
    `If you would like to take this forward, just reply to this email and I will coordinate a first conversation at a time that suits you both.`,
    `Warm regards,\n${matchmakerName}\nTDC Matchmaking`,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { subject: `An introduction from TDC: meet ${candidate.firstName}`, body: body.slice(0, 1500) };
}

export async function generateIntroduction(
  customer: Profile,
  candidate: Profile,
  context: { breakdown: MatchBreakdown; matchmakerName: string },
): Promise<IntroductionDraft> {
  const fallback = (reason: string): IntroductionDraft => ({
    source: 'fallback',
    model: null,
    ...fallbackIntroduction(customer, candidate, context.breakdown, context.matchmakerName),
    fallbackReason: reason,
  });
  if (!client)
    return fallback('OPENAI_API_KEY is not configured — using the standard introduction template.');
  try {
    const raw = await callJson(
      INTRO_SYSTEM,
      {
        client: { firstName: customer.firstName },
        matchmakerName: context.matchmakerName,
        candidate: publicSummary(candidate),
        sharedFacts: introFacts(context.breakdown),
      },
      'match_introduction',
      INTRO_SCHEMA,
    );
    const out = introductionOutput.parse(raw);
    const text = `${out.subject}\n${out.body}`;
    if (CONTACT_PATTERN.test(text)) throw new Error('AI output contained contact details');
    if (candidate.lastName && new RegExp(`\\b${candidate.lastName}\\b`, 'i').test(text))
      throw new Error('AI output contained a surname');
    if (!out.body.includes(candidate.firstName)) throw new Error('AI output did not name the candidate');
    if (/%|\d+\s*\/\s*100/.test(text)) throw new Error('AI output mentioned scores');
    return {
      source: 'ai',
      model: env.openai.model,
      subject: out.subject,
      body: out.body,
      fallbackReason: null,
    };
  } catch (err) {
    logger.warn(`[ai] introduction fell back: ${(err as Error).message}`);
    return fallback(
      'The AI service was unavailable or returned invalid output — using the standard introduction template.',
    );
  }
}
