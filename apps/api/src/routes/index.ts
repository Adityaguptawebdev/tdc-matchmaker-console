import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as customers from '../controllers/customer.controller';
import * as ops from '../controllers/operations.controller';
import { asyncHandler as h } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { aiLimiter, loginLimiter } from '../middleware/rateLimit';

/**
 * REST API — all routes are mounted under /api. See README.md#api-reference for request/response shapes.
 */
export function buildRouter(): Router {
  const r = Router();

  // Public
  r.get('/health', h(ops.health));
  r.post('/auth/login', loginLimiter, h(auth.login));
  r.post('/auth/logout', h(auth.logout));
  r.get('/auth/demo-credentials', h(auth.demoCredentials));

  // Authenticated
  r.use(requireAuth);
  r.get('/auth/me', h(auth.me));
  r.get('/dashboard', h(ops.dashboard));

  r.get('/customers', h(customers.list));
  r.get('/customers/:id', h(customers.detail));
  r.patch('/customers/:id', h(customers.update));

  r.get('/customers/:id/notes', h(customers.notes));
  r.post('/customers/:id/notes', h(customers.addNote));
  r.patch('/customers/:id/notes/:noteId', h(customers.editNote));
  r.delete('/customers/:id/notes/:noteId', h(customers.removeNote));

  r.get('/customers/:id/recommendations', h(customers.recommendations));
  r.get('/customers/:id/recommendations/:candidateId', h(customers.evaluate));
  r.post('/customers/:id/recommendations/:candidateId/explanation', aiLimiter, h(customers.explanation));
  r.put('/customers/:id/recommendations/:candidateId/decision', h(customers.decide));

  r.get('/candidates', h(ops.candidates));
  r.get('/candidates/:id', h(ops.candidate));

  r.post('/matches/introduction', aiLimiter, h(ops.draft));
  r.post('/matches', h(ops.send));
  r.get('/matches', h(ops.matches));
  r.patch('/matches/:id', h(ops.feedback));

  r.get('/activity', h(ops.activity));
  r.get('/outbox', h(ops.outbox));

  return r;
}
