import { cn, initials } from '../../lib/format';

// Muted tints; picked deterministically from the profile id so an avatar never changes colour.
const TINTS = [
  'bg-brand-100 text-brand-800',
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-900',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-teal-100 text-teal-800',
  'bg-stone-200 text-stone-800',
  'bg-orange-100 text-orange-900',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

/** Generated initials avatar — the app never loads photos of people. */
export function Avatar({
  id,
  firstName,
  lastName,
  size = 'md',
  className,
}: {
  id: string;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-white',
        TINTS[hash(id) % TINTS.length],
        SIZES[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
