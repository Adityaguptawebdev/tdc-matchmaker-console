import { useState } from 'react';
import type { MatchRecord, MatchStatus } from '@tdc/shared';
import { MATCH_STATUSES, MATCH_STATUS_LABELS } from '@tdc/shared';
import { MatchStatusBadge } from '../../components/StatusBadges';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Select, Textarea } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { api, errorMessage } from '../../lib/api';

/** Status selector for a sent match. Changing it asks for confirmation and an optional note. */
export function MatchFeedbackControl({
  match,
  onUpdated,
}: {
  match: MatchRecord;
  onUpdated: (m: MatchRecord) => void;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<MatchStatus | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const candidateName = match.candidate?.firstName ?? 'the candidate';

  const save = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await api.patch<MatchRecord>(`/matches/${match.id}`, {
        status: pending,
        note: note.trim() || undefined,
      });
      onUpdated(res.data);
      toast.success(
        'Feedback recorded',
        `Match with ${candidateName} is now “${MATCH_STATUS_LABELS[pending]}”.`,
      );
      setPending(null);
      setNote('');
    } catch (err) {
      toast.error('Could not update feedback', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Select
        aria-label={`Feedback status for match with ${candidateName}`}
        value={match.status}
        onChange={(e) => setPending(e.target.value as MatchStatus)}
        className="h-8 w-auto py-1 text-xs"
      >
        {MATCH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {MATCH_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <ConfirmDialog
        open={!!pending}
        title="Update match feedback"
        description={`Record the latest outcome for this introduction to ${candidateName}.`}
        confirmLabel="Save feedback"
        busy={busy}
        onClose={() => {
          setPending(null);
          setNote('');
        }}
        onConfirm={() => void save()}
      >
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-stone-600">
            <MatchStatusBadge status={match.status} /> → {pending && <MatchStatusBadge status={pending} />}
          </p>
          <Field label="Note (optional)" hint="e.g. what the client said, or when the meeting is.">
            {(a) => (
              <Textarea
                {...a}
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
          {pending === 'meeting_scheduled' && (
            <p className="text-xs text-stone-500">
              The customer’s journey will move to “Meeting scheduled” automatically.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
