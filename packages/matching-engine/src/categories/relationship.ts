import type { CheckResult, MarriageTimeline, YesNoMaybe } from '@tdc/shared';
import { MARITAL_STATUS_LABELS, MARRIAGE_TIMELINE_LABELS } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, type PairContext } from '../context';
import { listText } from '../utils';

const CATEGORY = 'relationshipGoals' as const;

/** Symmetric children-compatibility table. A definite yes vs. no is an explicit conflict. */
const CHILDREN_SCORES: Record<YesNoMaybe, Record<YesNoMaybe, number>> = {
  yes: { yes: 1, maybe: 0.6, no: 0 },
  no: { yes: 0, maybe: 0.5, no: 1 },
  maybe: { yes: 0.6, maybe: 0.7, no: 0.5 },
};

const TIMELINE_SCORES: Record<MarriageTimeline, Record<MarriageTimeline, number>> = {
  within_1_year: { within_1_year: 1, '1_to_2_years': 0.6, open: 0.8 },
  '1_to_2_years': { within_1_year: 0.6, '1_to_2_years': 1, open: 0.85 },
  open: { within_1_year: 0.8, '1_to_2_years': 0.85, open: 1 },
};

const childrenPhrase = (v: YesNoMaybe): string =>
  v === 'yes' ? 'wants children' : v === 'no' ? 'does not want children' : 'is undecided about children';

export function relationshipChecks(pair: PairContext): CheckResult[] {
  const { customer: a, candidate: b } = pair;
  const checks: CheckResult[] = [];

  // Children — the most consequential stated goal, compared symmetrically.
  const childSpec = {
    category: CATEGORY,
    id: 'children',
    label: 'Views on children',
    direction: 'mutual',
    weight: 3,
  } as const;
  const ca = a.person.preferences.wantsChildren;
  const cb = b.person.preferences.wantsChildren;
  if (!ca || !cb) {
    const missing = [!ca ? a.name : null, !cb ? b.name : null].filter(Boolean) as string[];
    checks.push(
      makeCheck(childSpec, 'unknown', null, `${listText(missing)} has not stated a view on children.`),
    );
  } else {
    const score = CHILDREN_SCORES[ca][cb];
    const detail =
      ca === cb
        ? ca === 'yes'
          ? 'Both want children.'
          : ca === 'no'
            ? 'Neither wants children.'
            : 'Both are undecided about children.'
        : `${a.name} ${childrenPhrase(ca)}; ${b.name} ${childrenPhrase(cb)}.`;
    checks.push(makeCheck(childSpec, score === 0 ? 'conflict' : outcomeFor(score), score, detail));
  }

  // Marriage timeline.
  const tlSpec = {
    category: CATEGORY,
    id: 'timeline',
    label: 'Marriage timeline',
    direction: 'mutual',
    weight: 1.5,
  } as const;
  const ta = a.person.preferences.marriageTimeline;
  const tb = b.person.preferences.marriageTimeline;
  if (!ta || !tb) {
    checks.push(makeCheck(tlSpec, 'unknown', null, 'Marriage timeline not stated by both.'));
  } else {
    const score = TIMELINE_SCORES[ta][tb];
    const detail =
      ta === tb
        ? `Both are looking to marry on the same timeline (${MARRIAGE_TIMELINE_LABELS[ta].toLowerCase()}).`
        : `${a.name}'s timeline is ${MARRIAGE_TIMELINE_LABELS[ta].toLowerCase()}; ${b.name}'s is ${MARRIAGE_TIMELINE_LABELS[tb].toLowerCase()}.`;
    checks.push(makeCheck(tlSpec, outcomeFor(score), score, detail));
  }

  // Marital-status preference, both directions.
  for (const { seeker, other, direction } of directions(pair)) {
    const spec = {
      category: CATEGORY,
      id: 'marital',
      label: 'Marital status preference',
      direction,
      weight: 1,
    };
    const accepted = seeker.person.preferences.maritalStatuses;
    const status = other.person.background.maritalStatus;
    if (accepted == null) {
      checks.push(
        makeCheck(spec, 'unknown', null, `${seeker.name} has not stated a marital-status preference.`),
      );
    } else if (accepted.length === 0) {
      continue; // Explicitly open: no constraint, so no evidence either way.
    } else if (!status) {
      checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s marital status is not recorded.`));
    } else if (accepted.includes(status)) {
      checks.push(
        makeCheck(
          spec,
          'match',
          1,
          `${other.name} (${MARITAL_STATUS_LABELS[status].toLowerCase()}) fits ${seeker.name}'s preference.`,
        ),
      );
    } else {
      checks.push(
        makeCheck(
          spec,
          'conflict',
          0.1,
          `${seeker.name} prefers ${listText(accepted.map((s) => MARITAL_STATUS_LABELS[s].toLowerCase()))}; ${other.name} is ${MARITAL_STATUS_LABELS[status].toLowerCase()}.`,
        ),
      );
    }
  }

  return checks;
}
