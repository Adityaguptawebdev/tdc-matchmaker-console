import type { CheckResult, Money, Range } from '@tdc/shared';
import type { MatchingConfig } from './config';

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export const normalizeText = (s: string): string => s.trim().toLowerCase();

const CITY_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru',
  bombay: 'mumbai',
  'new delhi': 'delhi',
  gurgaon: 'gurugram',
  madras: 'chennai',
  calcutta: 'kolkata',
};

export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const n = normalizeText(city);
  return CITY_ALIASES[n] ?? n;
}

/** Case-insensitive intersection preserving the order and casing of `a`. */
export function intersect(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(b.map(normalizeText));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of a) {
    const key = normalizeText(item);
    if (set.has(key) && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function containsCity(list: readonly string[], city: string | null): boolean {
  const target = normalizeCity(city);
  return target !== null && list.some((c) => normalizeCity(c) === target);
}

/** 0 when inside the range, otherwise the distance to the nearest bound. */
export function distanceOutside(value: number, range: Range): number {
  if (value < range.min) return range.min - value;
  if (value > range.max) return value - range.max;
  return 0;
}

export const formatRange = (r: Range, unit = ''): string => `${r.min}–${r.max}${unit}`;

export function toINR(m: Money, config: MatchingConfig): number {
  return m.amount * (config.fxToINR[m.currency] ?? 1);
}

export function formatMoney(m: Money): string {
  if (m.currency === 'INR') {
    if (m.amount >= 10_000_000) return `₹${round(m.amount / 10_000_000, 1)} Cr/yr`;
    return `₹${round(m.amount / 100_000, 1)} L/yr`;
  }
  return `${m.currency} ${round(m.amount / 1000, 0)}k/yr`;
}

/** "a", "a and b", "a, b and c" */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Sum of weights of checks with known scores divided by the total weight. */
export function evidenceOf(checks: readonly CheckResult[]): number {
  const total = checks.reduce((a, c) => a + c.weight, 0);
  if (total === 0) return 0;
  const known = checks.filter((c) => c.score !== null).reduce((a, c) => a + c.weight, 0);
  return known / total;
}

/** Weighted mean of known check scores on a 0..100 scale, or null when nothing is known. */
export function rawScoreOf(checks: readonly CheckResult[]): number | null {
  let w = 0;
  let s = 0;
  for (const c of checks) {
    if (c.score === null) continue;
    w += c.weight;
    s += c.score * c.weight;
  }
  return w === 0 ? null : (s / w) * 100;
}

/**
 * Evidence shrinkage: with incomplete data a category score is pulled toward a neutral 50
 * in proportion to the missing evidence. Unknown is neither rewarded nor punished.
 */
export function shrinkToNeutral(raw: number | null, evidence: number): number {
  if (raw === null) return 50;
  return 50 + (raw - 50) * evidence;
}
