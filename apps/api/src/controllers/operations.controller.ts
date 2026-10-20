import type { Request, Response } from 'express';
import type { SystemInfo } from '@tdc/shared';
import {
  activityQuerySchema,
  candidateListQuerySchema,
  introductionRequestSchema,
  matchFeedbackSchema,
  matchListQuerySchema,
  outboxQuerySchema,
  sendMatchSchema,
} from '@tdc/shared';
import { env } from '../config/env';
import { notFound, ok, paginate, parse } from '../lib/http';
import { toCandidateProfile, toCandidateSummary } from '../lib/mappers';
import { currentUser } from '../middleware/auth';
import { listActivities } from '../services/activity.service';
import { aiStatus } from '../services/ai.service';
import { getDashboard } from '../services/dashboard.service';
import { listOutbox } from '../services/email.service';
import { draftIntroduction, listMatches, sendMatch, updateMatchStatus } from '../services/match.service';
import { matchingConfig } from '../services/matching.service';
import { idParam } from '../validators/params';

const startedAt = Date.now();

export async function health(req: Request, res: Response) {
  const ai = aiStatus();
  ok(res, {
    status: 'ok',
    dataStore: req.store.kind,
    persistent: req.store.persistent,
    fallbackReason: req.store.fallbackReason,
    aiEnabled: ai.enabled,
    aiModel: ai.model,
    emailProvider: env.emailProvider,
    matching: {
      assignmentRulesEnabled: matchingConfig.assignmentRules.enabled,
      minScore: matchingConfig.minRecommendScore,
      engineVersion: matchingConfig.engineVersion,
    },
    environment: env.nodeEnv,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  } satisfies SystemInfo);
}

export async function dashboard(req: Request, res: Response) {
  ok(res, await getDashboard(req.store, currentUser(req)));
}

export async function activity(req: Request, res: Response) {
  const query = parse(activityQuerySchema, req.query);
  const { items, meta } = await listActivities(req.store, currentUser(req), query);
  ok(res, items, 200, meta);
}

export async function candidates(req: Request, res: Response) {
  const q = parse(candidateListQuerySchema, req.query);
  const filter = {
    ...(q.gender ? { gender: q.gender } : {}),
    ...(q.verification ? { 'verification.status': q.verification } : {}),
  };
  let items = await req.store.profiles.find(filter, { sort: { firstName: 1, lastName: 1 } });
  if (q.city) items = items.filter((p) => p.city?.toLowerCase() === q.city!.toLowerCase());
  if (q.search) {
    const term = q.search.toLowerCase();
    items = items.filter((p) =>
      [`${p.firstName} ${p.lastName}`, p.city ?? '', p.career.profession ?? ''].some((v) =>
        v.toLowerCase().includes(term),
      ),
    );
  }
  const page = paginate(items, q.page, q.pageSize);
  ok(
    res,
    page.items.map((p) => toCandidateSummary(p)),
    200,
    page.meta,
  );
}

export async function candidate(req: Request, res: Response) {
  const profile = await req.store.profiles.findById(idParam(req.params.id));
  if (!profile) throw notFound('Candidate');
  ok(res, toCandidateProfile(profile));
}

export async function draft(req: Request, res: Response) {
  const input = parse(introductionRequestSchema, req.body);
  ok(res, await draftIntroduction(req.store, currentUser(req), input.customerId, input.candidateId));
}

export async function send(req: Request, res: Response) {
  const input = parse(sendMatchSchema, req.body);
  ok(res, await sendMatch(req.store, currentUser(req), input), 201);
}

export async function matches(req: Request, res: Response) {
  const query = parse(matchListQuerySchema, req.query);
  const { items, meta } = await listMatches(req.store, currentUser(req), query);
  ok(res, items, 200, meta);
}

export async function feedback(req: Request, res: Response) {
  const input = parse(matchFeedbackSchema, req.body);
  ok(res, await updateMatchStatus(req.store, currentUser(req), idParam(req.params.id), input));
}

export async function outbox(req: Request, res: Response) {
  const q = parse(outboxQuerySchema, req.query);
  const { items, meta } = await listOutbox(req.store, currentUser(req), q.page, q.pageSize);
  ok(res, items, 200, meta);
}
