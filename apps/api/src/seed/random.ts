/** Reproducible pseudo-random helpers (mulberry32). The same seed always yields the same dataset. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Picks by relative weight: weighted([['a', 3], ['b', 1]]). */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = this.next() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r < 0) return value;
    }
    return entries[entries.length - 1]![0];
  }

  sample<T>(items: readonly T[], n: number): T[] {
    const copy = [...items];
    const out: T[] = [];
    while (out.length < n && copy.length > 0)
      out.push(copy.splice(Math.floor(this.next() * copy.length), 1)[0] as T);
    return out;
  }

  normal(mean: number, sd: number): number {
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export const DAY = 86_400_000;
export const daysAgo = (now: Date, days: number, hour = 11): string => {
  const d = new Date(now.getTime() - days * DAY);
  d.setUTCHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
};
