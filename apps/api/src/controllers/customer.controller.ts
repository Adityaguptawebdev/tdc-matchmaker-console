import type { Request, Response } from 'express';
import {
  customerListQuerySchema,
  customerUpdateSchema,
  noteCreateSchema,
  noteUpdateSchema,
  recommendationQuerySchema,
  suggestionDecisionSchema,
} from '@tdc/shared';
import { ok, parse } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { getAccessibleCustomer } from '../services/access';
import { generateMatchExplanation } from '../services/ai.service';
import { getCustomerDetail, listCustomers, updateCustomer } from '../services/customer.service';
import { hydrateMatches } from '../services/match.service';
import {
  evaluateCandidate,
  evaluatePair,
  getCandidateForCustomer,
  getRecommendations,
  setSuggestionDecision,
} from '../services/matching.service';
import { createNote, deleteNote, listNotes, updateNote } from '../services/note.service';
import { idParam } from '../validators/params';

export async function list(req: Request, res: Response) {
  const query = parse(customerListQuerySchema, req.query);
  const { items, meta } = await listCustomers(req.store, currentUser(req), query);
  ok(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  ok(res, await getCustomerDetail(req.store, currentUser(req), idParam(req.params.id)));
}

export async function update(req: Request, res: Response) {
  const patch = parse(customerUpdateSchema, req.body);
  ok(res, await updateCustomer(req.store, currentUser(req), idParam(req.params.id), patch));
}

export async function notes(req: Request, res: Response) {
  ok(res, await listNotes(req.store, currentUser(req), idParam(req.params.id)));
}

export async function addNote(req: Request, res: Response) {
  const input = parse(noteCreateSchema, req.body);
  ok(res, await createNote(req.store, currentUser(req), idParam(req.params.id), input), 201);
}

export async function editNote(req: Request, res: Response) {
  const input = parse(noteUpdateSchema, req.body);
  ok(
    res,
    await updateNote(req.store, currentUser(req), idParam(req.params.id), idParam(req.params.noteId), input),
  );
}

export async function removeNote(req: Request, res: Response) {
  await deleteNote(req.store, currentUser(req), idParam(req.params.id), idParam(req.params.noteId));
  res.status(204).end();
}

export async function recommendations(req: Request, res: Response) {
  const query = parse(recommendationQuerySchema, req.query);
  ok(res, await getRecommendations(req.store, currentUser(req), idParam(req.params.id), query));
}

export async function evaluate(req: Request, res: Response) {
  const result = await evaluateCandidate(
    req.store,
    currentUser(req),
    idParam(req.params.id),
    idParam(req.params.candidateId),
    async (m) => (await hydrateMatches(req.store, [m]))[0]!,
  );
  ok(res, result);
}

export async function explanation(req: Request, res: Response) {
  const customer = await getAccessibleCustomer(req.store, currentUser(req), idParam(req.params.id));
  const candidate = await getCandidateForCustomer(req.store, customer, idParam(req.params.candidateId));
  const { breakdown } = await evaluatePair(req.store, customer, candidate);
  ok(res, await generateMatchExplanation(customer, candidate, breakdown));
}

export async function decide(req: Request, res: Response) {
  const input = parse(suggestionDecisionSchema, req.body);
  ok(
    res,
    await setSuggestionDecision(
      req.store,
      currentUser(req),
      idParam(req.params.id),
      idParam(req.params.candidateId),
      input,
    ),
  );
}
