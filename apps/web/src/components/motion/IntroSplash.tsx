import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRound } from 'lucide-react';
import { prefersReducedMotion } from '../../hooks/useMotion';
import { cn } from '../../lib/format';
import { CoupleMeeting } from './CoupleMeeting';

const SEEN_KEY = 'tdc.introSeen';
const SHOW_MS = 2200;
const FADE_MS = 400;

function shouldShow(): boolean {
  if (prefersReducedMotion()) return false;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage unavailable (private mode, blocked site data): the intro simply plays again next time.
  }
}

function Person({ tone }: { tone: 'brand' | 'rose' }) {
  return (
    <span
      className={cn(
        'flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/15',
        tone === 'brand' ? 'text-brand-200' : 'text-rose-200',
      )}
    >
      <UserRound className="h-9 w-9" strokeWidth={1.5} />
    </span>
  );
}

/**
 * Brand intro shown once per browser session when the site opens: two people meet and a heart appears.
 * Decorative only — click or any key skips it, and it never plays under prefers-reduced-motion.
 */
export function IntroSplash() {
  const [phase, setPhase] = useState<'show' | 'leaving' | 'done'>(() => (shouldShow() ? 'show' : 'done'));

  useEffect(() => {
    if (phase !== 'show') return;
    markSeen();
    const timer = setTimeout(() => setPhase('leaving'), SHOW_MS);
    const skip = () => setPhase('leaving');
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', skip);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = setTimeout(() => setPhase('done'), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === 'done') return null;
  return createPortal(
    <div
      aria-hidden
      onClick={() => setPhase('leaving')}
      className={cn(
        'fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-brand-950',
        phase === 'leaving' && 'animate-fade-out',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <CoupleMeeting left={<Person tone="brand" />} right={<Person tone="rose" />} delayMs={100} />
      <p
        className="mt-10 animate-rise-in font-serif text-4xl font-semibold tracking-tight text-white"
        style={{ animationDelay: '950ms' }}
      >
        TDC
      </p>
      <p className="mt-2 animate-rise-in text-sm text-brand-200" style={{ animationDelay: '1100ms' }}>
        Matchmaker console
      </p>
      <p className="absolute bottom-8 text-xs text-brand-300/70">Click anywhere to skip</p>
    </div>,
    document.body,
  );
}
