import type { Note, NoteCreateInput, NoteUpdateInput } from '@tdc/shared';
import { NOTE_TYPE_LABELS, noteCreateSchema } from '@tdc/shared';
import { notFound } from '../lib/http';
import { newId, nowIso } from '../lib/ids';
import type { MatchmakerEntity, NoteEntity, ProfileEntity, Store } from '../store/types';
import { getAccessibleCustomer, matchmakerMap } from './access';
import { logActivity } from './activity.service';

async function hydrate(store: Store, notes: NoteEntity[]): Promise<Note[]> {
  const owners = await matchmakerMap(store);
  return notes.map((n) => ({ ...n, authorName: owners.get(n.authorId)?.name ?? null }));
}

const preview = (body: string) => (body.length > 80 ? `${body.slice(0, 77)}…` : body);

export async function listNotes(store: Store, user: MatchmakerEntity, customerId: string): Promise<Note[]> {
  await getAccessibleCustomer(store, user, customerId);
  return hydrate(store, await store.notes.find({ customerId }, { sort: { createdAt: -1 } }));
}

export async function createNote(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  input: NoteCreateInput,
): Promise<Note> {
  const customer = await getAccessibleCustomer(store, user, customerId);
  const data = noteCreateSchema.parse(input);
  const now = nowIso();
  const contactedAt = data.markContacted ? new Date(data.contactedAt ?? now).toISOString() : null;
  const note = await store.notes.insert({
    id: newId('note'),
    customerId,
    authorId: user.id,
    type: data.type,
    body: data.body,
    contactedAt,
    createdAt: now,
    updatedAt: now,
  });
  if (contactedAt && customer.matchmaking) {
    const current = customer.matchmaking.lastContactedAt;
    // Never move "last contacted" backwards when back-dating a note.
    if (!current || contactedAt > current) {
      await store.profiles.update(customerId, {
        matchmaking: { ...customer.matchmaking, lastContactedAt: contactedAt },
        updatedAt: now,
      } as Partial<ProfileEntity>);
    }
  }
  await logActivity(store, {
    type: 'note_added',
    actorId: user.id,
    customerId,
    message: `${NOTE_TYPE_LABELS[data.type]} logged: "${preview(data.body)}"`,
    meta: { noteId: note.id, noteType: data.type },
  });
  return (await hydrate(store, [note]))[0]!;
}

async function getOwnedNote(store: Store, user: MatchmakerEntity, customerId: string, noteId: string) {
  await getAccessibleCustomer(store, user, customerId);
  const note = await store.notes.findById(noteId);
  if (!note || note.customerId !== customerId) throw notFound('Note');
  return note;
}

export async function updateNote(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  noteId: string,
  input: NoteUpdateInput,
): Promise<Note> {
  await getOwnedNote(store, user, customerId, noteId);
  const updated = await store.notes.update(noteId, { ...input, updatedAt: nowIso() });
  await logActivity(store, {
    type: 'note_updated',
    actorId: user.id,
    customerId,
    message: 'Note edited',
    meta: { noteId },
  });
  return (await hydrate(store, [updated!]))[0]!;
}

export async function deleteNote(
  store: Store,
  user: MatchmakerEntity,
  customerId: string,
  noteId: string,
): Promise<void> {
  const note = await getOwnedNote(store, user, customerId, noteId);
  await store.notes.delete(noteId);
  await logActivity(store, {
    type: 'note_deleted',
    actorId: user.id,
    customerId,
    message: `${NOTE_TYPE_LABELS[note.type]} deleted`,
    meta: { noteId },
  });
}
