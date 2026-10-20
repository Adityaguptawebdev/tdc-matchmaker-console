import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { LoginInput } from '@tdc/shared';
import { AppError } from '../lib/http';
import type { MatchmakerEntity, Store } from '../store/types';

export const BCRYPT_ROUNDS = 10;

// Compared against when the user does not exist so that response timing does not reveal
// which usernames are registered.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync(crypto.randomUUID(), BCRYPT_ROUNDS));

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function authenticate(store: Store, input: LoginInput): Promise<MatchmakerEntity> {
  const identifier = input.identifier.trim().toLowerCase();
  const field = identifier.includes('@') ? 'email' : 'username';
  const [user] = await store.matchmakers.find({ [field]: identifier }, { limit: 1 });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? getDummyHash());
  if (!user || !valid) {
    // Same message for unknown user and wrong password.
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect username/email or password.');
  }
  return user;
}
