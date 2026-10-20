import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Cpu, Heart, Mail, RefreshCw, Send, Sparkles } from 'lucide-react';
import type { CandidateSummary, IntroductionDraft, MatchBreakdown, MatchRecord } from '@tdc/shared';
import { MARITAL_STATUS_LABELS, introductionFormSchema } from '@tdc/shared';
import { BandBadge, ScoreRing, VerificationBadge } from '../../components/StatusBadges';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Feedback';
import { Field, Textarea } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { ApiError, api, errorMessage } from '../../lib/api';
import { orDash } from '../../lib/format';

function PersonSummary({ p, role }: { p: CandidateSummary; role: string }) {
  return (
    <div className="flex-1 rounded-xl border border-stone-200 p-3.5">
      <p className="label mb-2">{role}</p>
      <div className="flex items-center gap-3">
        <Avatar id={p.id} firstName={p.firstName} lastName={p.lastName} />
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">
            {p.firstName} {p.lastName}
          </p>
          <p className="truncate text-xs text-stone-500">
            {orDash(p.age)} · {orDash(p.city)} · {orDash(p.profession)}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <VerificationBadge status={p.verificationStatus} compact />
        {p.maritalStatus && <Badge>{MARITAL_STATUS_LABELS[p.maritalStatus]}</Badge>}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  customer: CandidateSummary;
  candidate: CandidateSummary;
  breakdown: MatchBreakdown;
  onSent: (match: MatchRecord) => void;
}

export function SendMatchModal({ open, onClose, customer, candidate, breakdown, onSent }: Props) {
  const toast = useToast();
  const [draft, setDraft] = useState<IntroductionDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const sendingRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ introduction: string }>({
    resolver: zodResolver(introductionFormSchema),
    defaultValues: { introduction: '' },
  });
  const text = watch('introduction') ?? '';

  const loadDraft = useCallback(async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await api.post<IntroductionDraft>('/matches/introduction', {
        customerId: customer.id,
        candidateId: candidate.id,
      });
      setDraft(res.data);
      reset({ introduction: res.data.body });
    } catch (err) {
      setDraftError(errorMessage(err));
    } finally {
      setDrafting(false);
    }
  }, [customer.id, candidate.id, reset]);

  useEffect(() => {
    if (!open) return;
    setConfirmed(false);
    setDraft(null);
    reset({ introduction: '' });
    void loadDraft();
  }, [open, loadDraft, reset]);

  const send = handleSubmit(async ({ introduction }) => {
    // Guards against double submission in addition to the disabled button and the server's duplicate check.
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const edited = !draft || introduction.trim() !== draft.body.trim();
      const res = await api.post<MatchRecord>('/matches', {
        customerId: customer.id,
        candidateId: candidate.id,
        introduction,
        introductionSource: edited ? 'edited' : draft.source,
        confirm: true,
      });
      toast.success(
        `Introduction sent to ${customer.firstName}`,
        `Simulated email logged to the outbox for ${customer.firstName} and ${candidate.firstName}.`,
      );
      onSent(res.data);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_MATCH') {
        toast.error('Already introduced', err.message);
        onClose();
      } else {
        toast.error('Could not send introduction', errorMessage(err));
      }
    } finally {
      sendingRef.current = false;
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      title="Send match introduction"
      description="Review both profiles and the message before sending."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void send()}
            loading={isSubmitting}
            disabled={!confirmed || drafting || !text.trim()}
            icon={<Send className="h-4 w-4" />}
          >
            Confirm & send
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <PersonSummary p={customer} role="Customer" />
          <div className="flex flex-col items-center gap-1 px-1">
            <ScoreRing score={breakdown.score} band={breakdown.band} size={56} />
            <Heart className="h-4 w-4 animate-heartbeat fill-rose-400 text-rose-400" aria-hidden />
          </div>
          <PersonSummary p={candidate} role="Suggested match" />
        </div>
        <div className="flex justify-center">
          <BandBadge band={breakdown.band} confidence={breakdown.confidence} />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-stone-700">Introduction to {customer.firstName}</p>
              {draft &&
                (draft.source === 'ai' ? (
                  <Badge tone="brand" icon={<Sparkles className="h-3 w-3" aria-hidden />}>
                    AI draft
                  </Badge>
                ) : (
                  <Badge
                    icon={<Cpu className="h-3 w-3" aria-hidden />}
                    title={draft.fallbackReason ?? undefined}
                  >
                    Standard template
                  </Badge>
                ))}
              {draft && text.trim() !== draft.body.trim() && <Badge tone="amber">Edited</Badge>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void loadDraft()}
              disabled={drafting || isSubmitting}
            >
              Regenerate
            </Button>
          </div>
          {drafting && !draft ? (
            <div className="space-y-2" aria-label="Drafting introduction">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <Field
              label="Introduction message"
              srOnlyLabel
              error={errors.introduction?.message ?? draftError ?? undefined}
              hint={`${text.length}/1500 · you can edit this before sending`}
            >
              {(a) => (
                <Textarea
                  {...a}
                  {...register('introduction')}
                  rows={11}
                  className="font-[inherit] text-[13px]"
                />
              )}
            </Field>
          )}
          {draft?.fallbackReason && <p className="mt-1.5 text-xs text-stone-500">{draft.fallbackReason}</p>}
        </div>

        <div className="flex gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-900">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong className="font-semibold">Simulated email.</strong> No real email is sent — the
            introduction is recorded in match history and logged to the development outbox for{' '}
            {customer.firstName} and {candidate.firstName}.
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-500"
          />
          I have reviewed both profiles and the message, and want to send this introduction.
        </label>
      </div>
    </Modal>
  );
}
