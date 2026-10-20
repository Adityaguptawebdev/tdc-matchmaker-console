import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

export type Tone = 'neutral' | 'brand' | 'green' | 'amber' | 'rose' | 'sky' | 'teal' | 'violet';

const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-stone-100 text-stone-700 ring-stone-500/15', dot: 'bg-stone-400' },
  brand: { pill: 'bg-brand-50 text-brand-800 ring-brand-600/15', dot: 'bg-brand-500' },
  green: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15', dot: 'bg-emerald-500' },
  amber: { pill: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  rose: { pill: 'bg-rose-50 text-rose-800 ring-rose-600/15', dot: 'bg-rose-500' },
  sky: { pill: 'bg-sky-50 text-sky-800 ring-sky-600/15', dot: 'bg-sky-500' },
  teal: { pill: 'bg-teal-50 text-teal-800 ring-teal-600/15', dot: 'bg-teal-500' },
  violet: { pill: 'bg-violet-50 text-violet-800 ring-violet-600/15', dot: 'bg-violet-500' },
};

export function Badge({
  tone = 'neutral',
  dot,
  icon,
  children,
  className,
  title,
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone].pill,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}
