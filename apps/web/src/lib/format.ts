import type { Money, Range, YesNoMaybe } from '@tdc/shared';
import { YES_NO_MAYBE_LABELS } from '@tdc/shared';

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dateTimeFmt.format(new Date(iso)) : '—';

/** Calendar date of birth (YYYY-MM-DD) without timezone drift. */
export function formatDob(dob: string | null) {
  if (!dob) return 'Not provided';
  const [y, m, d] = dob.split('-').map(Number);
  return dateFmt.format(new Date(Date.UTC(y!, m! - 1, d!)));
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86_400_000],
    ['month', 30 * 86_400_000],
    ['week', 7 * 86_400_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  return 'just now';
}

export const daysSince = (iso: string | null | undefined) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

export function formatIncome(m: Money | null | undefined): string {
  if (!m) return 'Not disclosed';
  if (m.currency === 'INR') {
    if (m.amount >= 10_000_000) return `₹${(m.amount / 10_000_000).toFixed(1)} Cr / year`;
    return `₹${Math.round(m.amount / 100_000)} L / year`;
  }
  return `${m.currency} ${Math.round(m.amount / 1000)}k / year`;
}

export const formatRange = (r: Range | null | undefined, unit = '') =>
  r ? `${r.min}–${r.max}${unit}` : 'Not specified';
export const yesNoMaybe = (v: YesNoMaybe | null | undefined) => (v ? YES_NO_MAYBE_LABELS[v] : 'Not stated');
export const orDash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v);

export function listOrOpen(list: string[] | null | undefined, labels?: Record<string, string>): string {
  if (list == null) return 'Not stated';
  if (list.length === 0) return 'Open to any';
  return list.map((v) => labels?.[v] ?? v).join(', ');
}

export const initials = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
