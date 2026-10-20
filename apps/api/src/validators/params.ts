import { z } from 'zod';
import { parse } from '../lib/http';

/** Route ids are opaque, URL-safe strings; anything else is rejected before touching the store. */
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid id');

export const idParam = (value: unknown): string => parse(id, value);
