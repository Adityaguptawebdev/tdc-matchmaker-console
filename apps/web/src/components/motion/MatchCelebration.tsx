import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CandidateSummary } from '@tdc/shared';
import { Avatar } from '../ui/Avatar';
import { CoupleMeeting } from './CoupleMeeting';

type Person = Pick<CandidateSummary, 'id' | 'firstName' | 'lastName'>;

const AUTO_CLOSE_MS = 3000;

/**
 * Short celebration after an introduction is sent: the two avatars meet and a heart appears.
 * Closes itself, on click, or on any key. The success toast still carries the same message.
 */
export function MatchCelebration({
  customer,
  candidate,
  onDone,
}: {
  customer: Person;
  candidate: Person;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_CLOSE_MS);
    window.addEventListener('keydown', onDone);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onDone);
    };
  }, [onDone]);

  return createPortal(
    <div
      onClick={onDone}
      className="fixed inset-0 z-[70] grid animate-fade-in cursor-pointer place-items-center bg-stone-950/40 p-4 backdrop-blur-[2px]"
    >
      <div
        role="status"
        aria-live="polite"
        className="card w-[min(420px,100%)] animate-pop-in px-8 pb-7 pt-10 text-center"
      >
        <CoupleMeeting
          tone="light"
          left={
            <Avatar id={customer.id} firstName={customer.firstName} lastName={customer.lastName} size="xl" />
          }
          right={
            <Avatar
              id={candidate.id}
              firstName={candidate.firstName}
              lastName={candidate.lastName}
              size="xl"
            />
          }
        />
        <p
          className="mt-6 animate-rise-in text-xs font-semibold uppercase tracking-wide text-emerald-700"
          style={{ animationDelay: '700ms' }}
        >
          Introduction sent
        </p>
        <p
          className="mt-1 animate-rise-in font-serif text-2xl font-semibold text-stone-900"
          style={{ animationDelay: '800ms' }}
        >
          {customer.firstName} &amp; {candidate.firstName}
        </p>
        <p className="mt-2 animate-rise-in text-sm text-stone-500" style={{ animationDelay: '900ms' }}>
          Simulated email logged to the outbox. Track their response in Match history.
        </p>
      </div>
    </div>,
    document.body,
  );
}
