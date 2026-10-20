import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/http';
import type { MatchmakerEntity, Store } from '../store/types';

export const SESSION_COOKIE = 'tdc_session';

export interface SessionClaims {
  sub: string;
  role: MatchmakerEntity['role'];
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: MatchmakerEntity;
    store: Store;
  }
}

export function signSession(user: MatchmakerEntity): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3600_000);
  const token = jwt.sign({ sub: user.id, role: user.role } satisfies SessionClaims, env.jwtSecret, {
    expiresIn: Math.floor(env.sessionTtlHours * 3600),
    algorithm: 'HS256',
  });
  return { token, expiresAt };
}

function extractToken(req: Parameters<RequestHandler>[0]): string | null {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Verifies the JWT (httpOnly cookie, or Bearer header for API clients) and loads the matchmaker. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    let claims: SessionClaims;
    try {
      claims = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as SessionClaims;
    } catch {
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    const user = await req.store.matchmakers.findById(claims.sub);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export function currentUser(req: Parameters<RequestHandler>[0]): MatchmakerEntity {
  if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  return req.user;
}
