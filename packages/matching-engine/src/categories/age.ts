import type { CheckResult } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, resolveRelation, type PairContext } from '../context';
import { distanceOutside, formatRange } from '../utils';

const CATEGORY = 'age' as const;

export function ageChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];
  const margin = pair.config.softMargins.ageYears;

  for (const { seeker, other, direction } of directions(pair)) {
    // Preferred age range: inside = match, within the soft margin = partial, beyond = conflict.
    const rangeSpec = { category: CATEGORY, id: 'range', label: 'Preferred age range', direction, weight: 3 };
    const range = seeker.person.preferences.ageRange;
    if (!range) {
      checks.push(
        makeCheck(rangeSpec, 'unknown', null, `${seeker.name} has not stated a preferred age range.`),
      );
    } else if (other.age === null) {
      checks.push(makeCheck(rangeSpec, 'unknown', null, `${other.name}'s age is unknown.`));
    } else {
      const d = distanceOutside(other.age, range);
      if (d === 0) {
        checks.push(
          makeCheck(
            rangeSpec,
            'match',
            1,
            `${other.name} (${other.age}) is within ${seeker.name}'s preferred ${formatRange(range)}.`,
          ),
        );
      } else if (d <= margin) {
        checks.push(
          makeCheck(
            rangeSpec,
            'partial',
            0.5,
            `${other.name} (${other.age}) is ${d} year${d === 1 ? '' : 's'} outside ${seeker.name}'s preferred ${formatRange(range)}.`,
          ),
        );
      } else {
        checks.push(
          makeCheck(
            rangeSpec,
            'conflict',
            0,
            `${other.name} (${other.age}) is outside ${seeker.name}'s preferred ${formatRange(range)}.`,
          ),
        );
      }
    }

    // Relative age preference (stated, or an assignment default for the customer — labelled as such).
    const rel = resolveRelation(seeker, 'partnerAgeRelation', pair.config);
    if (!rel || rel.value === 'no_preference') continue;
    const relSpec = {
      category: CATEGORY,
      id: 'relation',
      label: 'Relative age preference',
      direction,
      weight: 2,
      source: rel.source,
    };
    const suffix = rel.source === 'default_rule' ? ' (assignment default rule)' : '';
    if (seeker.age === null || other.age === null) {
      checks.push(
        makeCheck(relSpec, 'unknown', null, `Cannot compare ages — date of birth missing.${suffix}`),
      );
      continue;
    }
    // diff > 0 means the other person is younger than the seeker.
    const diff = seeker.age - other.age;
    let score: number;
    let detail: string;
    const gap = Math.abs(diff);
    const gapText =
      gap === 0
        ? 'the same age as'
        : `${gap} year${gap === 1 ? '' : 's'} ${diff > 0 ? 'younger' : 'older'} than`;
    if (rel.value === 'lower') {
      score = diff >= 1 ? 1 : diff === 0 ? 0.6 : diff >= -2 ? 0.4 : 0.15;
      detail = `${seeker.name} prefers a younger partner; ${other.name} is ${gapText} ${seeker.name}.${suffix}`;
    } else if (rel.value === 'higher') {
      score = diff <= -1 ? 1 : diff === 0 ? 0.6 : diff <= 2 ? 0.4 : 0.15;
      detail = `${seeker.name} prefers an older partner; ${other.name} is ${gapText} ${seeker.name}.${suffix}`;
    } else {
      score = gap <= 3 ? 1 : gap <= 6 ? 0.6 : 0.25;
      detail = `${seeker.name} prefers someone of a similar age; ${other.name} is ${gapText} ${seeker.name}.${suffix}`;
    }
    checks.push(makeCheck(relSpec, outcomeFor(score), score, detail));
  }

  return checks;
}
