import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { Note, NoteType } from '@tdc/shared';
import { NOTE_TYPES, NOTE_TYPE_LABELS, noteCreateSchema } from '@tdc/shared';
import { Badge, type Tone } from '../../components/ui/Badge';
import { Button, IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Field, Select, Textarea } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { useApi } from '../../hooks/useApi';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, relativeTime } from '../../lib/format';

const TYPE_TONES: Record<NoteType, Tone> = {
  call: 'sky',
  meeting: 'violet',
  note: 'neutral',
  feedback: 'amber',
};

const formSchema = noteCreateSchema.pick({ type: true, body: true }).extend({ markContacted: z.boolean() });
type FormValues = z.infer<typeof formSchema>;

function NoteForm({
  initial,
  submitLabel,
  showContact,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  showContact: boolean;
  /** Return false to keep the form contents (e.g. after a failed save). */
  onSubmit: (values: FormValues) => Promise<boolean | void>;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: initial });
  const body = watch('body') ?? '';
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const ok = await onSubmit(values);
        if (ok !== false && !onCancel) reset({ ...initial, type: values.type });
      })}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field label="Type" error={errors.type?.message}>
          {(a) => (
            <Select {...a} {...register('type')}>
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {NOTE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Note" error={errors.body?.message} hint={`${body.length}/2000`}>
          {(a) => (
            <Textarea
              {...a}
              {...register('body')}
              rows={3}
              placeholder="What was discussed? Any updates to preferences or next steps?"
            />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showContact ? (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              {...register('markContacted')}
              className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-500"
            />
            Update “last contacted” to now
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NotesPanel({
  customerId,
  customerName,
  onChanged,
}: {
  customerId: string;
  customerName: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const {
    data: notes,
    loading,
    error,
    reload,
  } = useApi(() => api.get<Note[]>(`/customers/${customerId}/notes`), customerId);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (values: FormValues) => {
    try {
      await api.post(`/customers/${customerId}/notes`, values);
      toast.success(
        'Note saved',
        values.markContacted ? `Last contact with ${customerName} updated.` : undefined,
      );
      await reload();
      onChanged();
      return true;
    } catch (err) {
      toast.error('Could not save note', errorMessage(err));
      return false;
    }
  };

  const update = async (id: string, values: FormValues) => {
    try {
      await api.patch(`/customers/${customerId}/notes/${id}`, { type: values.type, body: values.body });
      toast.success('Note updated');
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error('Could not update note', errorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`/customers/${customerId}/notes/${deleting.id}`);
      toast.success('Note deleted');
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error('Could not delete note', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Log a call, meeting or note</h3>
        <NoteForm
          initial={{ type: 'call', body: '', markContacted: true }}
          submitLabel="Save note"
          showContact
          onSubmit={create}
        />
      </section>

      <section aria-label="Notes timeline">
        {error ? (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        ) : loading && !notes ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : notes?.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<MessageSquare className="h-5 w-5" />}
              title="No notes yet"
              description={`Notes from calls and meetings with ${customerName} will appear here.`}
            />
          </div>
        ) : (
          <ol className="space-y-3">
            {notes?.map((n) => (
              <li key={n.id} className="card p-4">
                {editing === n.id ? (
                  <NoteForm
                    initial={{ type: n.type, body: n.body, markContacted: false }}
                    submitLabel="Save changes"
                    showContact={false}
                    onSubmit={(v) => update(n.id, v)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <Badge tone={TYPE_TONES[n.type]}>{NOTE_TYPE_LABELS[n.type]}</Badge>
                        <span className="font-medium text-stone-700">{n.authorName ?? 'Unknown'}</span>
                        <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
                          {relativeTime(n.createdAt)}
                        </time>
                        {n.updatedAt !== n.createdAt && <span>· edited</span>}
                        {n.contactedAt && (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CalendarCheck className="h-3 w-3" aria-hidden /> counted as contact
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton label="Edit note" onClick={() => setEditing(n.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton label="Delete note" tone="danger" onClick={() => setDeleting(n)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800">
                      {n.body}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this note?"
        description="The note will be permanently removed. The deletion is recorded in the activity timeline."
        confirmLabel="Delete note"
        tone="danger"
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      >
        <p className="line-clamp-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {deleting?.body}
        </p>
      </ConfirmDialog>
    </div>
  );
}
