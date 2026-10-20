import type { CookieOptions, Request, Response } from 'express';
import type { SessionInfo } from '@tdc/shared';
import { loginSchema } from '@tdc/shared';
import { env } from '../config/env';
import { DEMO_PASSWORD, DEMO_USERS } from '../seed/matchmakers';
import { notFound, ok, parse } from '../lib/http';
import { toPublicMatchmaker } from '../lib/mappers';
import { SESSION_COOKIE, currentUser, signSession } from '../middleware/auth';
import { authenticate } from '../services/auth.service';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: '/',
});

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  const user = await authenticate(req.store, input);
  const { token, expiresAt } = signSession(user);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
  // The token is also returned for non-browser API clients (Bearer auth). The web app relies only on the
  // httpOnly cookie and never stores the token itself.
  ok(res, {
    user: toPublicMatchmaker(user),
    expiresAt: expiresAt.toISOString(),
    token,
  } satisfies SessionInfo & { token: string });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  ok(res, { signedOut: true });
}

export async function me(req: Request, res: Response) {
  ok(res, { user: toPublicMatchmaker(currentUser(req)) });
}

/** Demo credentials are served only when explicitly enabled (default: development only). */
export async function demoCredentials(_req: Request, res: Response) {
  if (!env.showDemoCredentials) throw notFound('Route');
  ok(res, {
    password: DEMO_PASSWORD,
    users: DEMO_USERS.map((u) => ({ username: u.username, name: u.name, role: u.role, title: u.title })),
  });
}
