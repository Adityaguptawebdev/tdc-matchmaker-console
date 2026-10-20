import type { OutboxEmail } from '@tdc/shared';
import { newId, nowIso } from '../lib/ids';
import { logger } from '../lib/logger';
import { paginate } from '../lib/http';
import type { MatchmakerEntity, OutboxEntity, Store } from '../store/types';
import { customerScope } from './access';

export interface EmailMessage {
  matchId: string;
  to: string;
  toName: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  readonly name: 'mock';
  send(message: EmailMessage): Promise<OutboxEntity>;
}

/**
 * Development email provider: nothing is delivered. Each message is written to the outbox collection
 * (visible on the Outbox page) and logged to the console, and is always labelled as simulated.
 */
export function createMockEmailProvider(store: Store): EmailProvider {
  return {
    name: 'mock',
    async send(message) {
      const record = await store.outbox.insert({
        id: newId('email'),
        provider: 'mock',
        createdAt: nowIso(),
        ...message,
      });
      logger.info(`[mock-email] SIMULATED → ${message.toName} <${message.to}> — "${message.subject}"`);
      return record;
    },
  };
}

const toDto = (e: OutboxEntity): OutboxEmail => ({ ...e, simulated: true });

export async function listOutbox(store: Store, user: MatchmakerEntity, page: number, pageSize: number) {
  const customers = await store.profiles.find(customerScope(user));
  const matches = customers.length
    ? await store.matches.find({ customerId: { $in: customers.map((c) => c.id) } })
    : [];
  const emails = matches.length
    ? await store.outbox.find({ matchId: { $in: matches.map((m) => m.id) } }, { sort: { createdAt: -1 } })
    : [];
  const { items, meta } = paginate(emails, page, pageSize);
  return { items: items.map(toDto), meta };
}
