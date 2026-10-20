import type { CheckResult, MatchBreakdown, MatchExplanation, Profile } from '@tdc/shared';
import {
  CONFIDENCE_LABELS,
  RELATIVE_AGE_LABELS,
  RELATIVE_HEIGHT_LABELS,
  RELATIVE_INCOME_LABELS,
} from '@tdc/shared';
import type { MatchingConfig, RelationField } from './config';
import { listText } from './utils';

interface Ranked {
  check: CheckResult;
  /** Contribution weight in the final score: category weight × check weight. */
  impact: number;
}

const byImpact = (a: Ranked, b: Ranked) => b.impact - a.impact || a.check.id.localeCompare(b.check.id);

/** Picks the highest-impact items while limiting how many come from one category, for variety. */
function pickDiverse(items: Ranked[], max: number, perCategory: number): string[] {
  const counts = new Map<string, number>();
  const out: string[] = [];
  for (const item of [...items].sort(byImpact)) {
    const n = counts.get(item.check.category) ?? 0;
    if (n >= perCategory) continue;
    counts.set(item.check.category, n + 1);
    out.push(item.check.detail);
    if (out.length >= max) break;
  }
  return out;
}

const RELATION_FIELDS: Record<string, { field: RelationField; labels: Record<string, string> }> = {
  'age.relation': { field: 'partnerAgeRelation', labels: RELATIVE_AGE_LABELS },
  'careerEducation.income': { field: 'partnerIncomeRelation', labels: RELATIVE_INCOME_LABELS },
  'otherPreferences.heightRelation': { field: 'partnerHeightRelation', labels: RELATIVE_HEIGHT_LABELS },
};

/**
 * Deterministic explanation built only from the check details, which in turn are built only from
 * profile data. Nothing here is inferred or invented.
 */
export function generateExplanation(
  b: MatchBreakdown,
  customer: Profile,
  candidate: Profile,
  config: MatchingConfig,
): MatchExplanation {
  const ranked: Ranked[] = b.categories.flatMap((cat) =>
    cat.checks.map((check) => ({ check, impact: cat.weight * check.weight })),
  );

  const strengths = pickDiverse(
    ranked.filter((r) => r.check.outcome === 'match'),
    5,
    2,
  );
  const conflicts = ranked.filter((r) => r.check.outcome === 'conflict').sort(byImpact);
  // Partials are ranked by how many points they cost: impact × (1 − score).
  const partials = ranked
    .filter((r) => r.check.outcome === 'partial')
    .map((r) => ({ ...r, impact: r.impact * (1 - (r.check.score ?? 1)) }))
    .sort(byImpact);
  const considerations = [...conflicts, ...partials].slice(0, 5).map((r) => r.check.detail);
  const unknowns = ranked
    .filter((r) => r.check.outcome === 'unknown')
    .sort(byImpact)
    .slice(0, 4)
    .map((r) => r.check.detail);

  const assumptions: string[] = [];
  const seen = new Set<string>();
  for (const { check } of ranked) {
    if (check.source !== 'default_rule') continue;
    const key = check.id.replace(/\.(forward|reverse)$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    const rel = RELATION_FIELDS[key];
    const value =
      rel && customer.gender
        ? config.assignmentRules.relationDefaults[customer.gender][rel.field]
        : undefined;
    const pref = rel && value ? rel.labels[value] : undefined;
    assumptions.push(
      `${customer.firstName} has not stated a ${check.label.toLowerCase()}; the configured assignment default${pref ? ` ("${pref.toLowerCase()}")` : ''} was applied.`,
    );
  }
  if (b.weightProfile === 'female_customer') {
    const w = Object.fromEntries(b.categories.map((c) => [c.key, c.weight]));
    assumptions.push(
      `Female-customer weight profile applied: career ${w.careerEducation}%, lifestyle & values ${w.lifestyleValues}%, location & relocation ${w.location}%.`,
    );
  }
  const dropped = b.categories.filter((c) => c.weight === 0).map((c) => c.label.toLowerCase());
  if (dropped.length > 0) {
    assumptions.push(
      `No applicable preferences for ${listText(dropped)}; that weight was redistributed to the other categories.`,
    );
  }

  const top = b.categories
    .filter((c) => c.weight > 0 && c.rawScore !== null && c.score >= 70)
    .sort((x, y) => y.score - x.score || y.weight - x.weight)
    .slice(0, 2)
    .map((c) => c.label.toLowerCase());
  let headline = `${b.bandLabel} — ${b.score}/100 (${CONFIDENCE_LABELS[b.confidence].toLowerCase()}).`;
  if (top.length > 0) headline += ` Strongest alignment on ${listText(top)}.`;
  if (conflicts.length > 0) {
    headline += ` ${conflicts.length} potential conflict${conflicts.length > 1 ? 's' : ''} to discuss with ${customer.firstName}.`;
  } else if (b.directional.capApplied) {
    headline += ` ${candidate.firstName}'s own preferences are only partly met.`;
  }

  return { headline, strengths, considerations, unknowns, assumptions };
}
