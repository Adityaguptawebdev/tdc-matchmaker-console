import type { CheckResult } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, resolveRelation, type PairContext } from '../context';
import { distanceOutside, formatRange, listText, normalizeText } from '../utils';

const CATEGORY = 'otherPreferences' as const;

/**
 * Optional, explicitly stated preferences: height range, relative height, and (only when the person has
 * volunteered it) religion. Caste/community preferences are displayed to matchmakers but never scored.
 */
export function otherChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];
  const margin = pair.config.softMargins.heightCm;

  for (const { seeker, other, direction } of directions(pair)) {
    const prefs = seeker.person.preferences;
    const h = other.person.heightCm;

    if (prefs.heightRangeCm) {
      const spec = {
        category: CATEGORY,
        id: 'heightRange',
        label: 'Preferred height range',
        direction,
        weight: 2,
      };
      const range = prefs.heightRangeCm;
      if (h == null) {
        checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s height is not recorded.`));
      } else {
        const d = distanceOutside(h, range);
        const score = d === 0 ? 1 : d <= margin ? 0.5 : 0.15;
        const detail =
          d === 0
            ? `${other.name} (${h} cm) is within ${seeker.name}'s preferred ${formatRange(range, ' cm')}.`
            : `${other.name} (${h} cm) is ${d} cm outside ${seeker.name}'s preferred ${formatRange(range, ' cm')}.`;
        checks.push(makeCheck(spec, outcomeFor(score), score, detail));
      }
    }

    const rel = resolveRelation(seeker, 'partnerHeightRelation', pair.config);
    if (rel && rel.value !== 'no_preference') {
      const spec = {
        category: CATEGORY,
        id: 'heightRelation',
        label: 'Relative height preference',
        direction,
        weight: 1,
        source: rel.source,
      };
      const suffix = rel.source === 'default_rule' ? ' (assignment default rule)' : '';
      const mine = seeker.person.heightCm;
      if (mine == null || h == null) {
        checks.push(makeCheck(spec, 'unknown', null, `Height not recorded for both.${suffix}`));
      } else {
        const diff = h - mine; // > 0: other is taller than seeker
        const fact =
          Math.abs(diff) <= 1
            ? `${other.name} is about the same height`
            : `${other.name} is ${Math.abs(diff)} cm ${diff > 0 ? 'taller' : 'shorter'}`;
        let score: number;
        let pref: string;
        if (rel.value === 'lower') {
          score = diff < -1 ? 1 : Math.abs(diff) <= 1 ? 0.6 : 0.25;
          pref = 'a shorter partner';
        } else if (rel.value === 'higher') {
          score = diff > 1 ? 1 : Math.abs(diff) <= 1 ? 0.6 : 0.25;
          pref = 'a taller partner';
        } else {
          score = Math.abs(diff) <= 5 ? 1 : Math.abs(diff) <= 10 ? 0.6 : 0.3;
          pref = 'a partner of similar height';
        }
        checks.push(
          makeCheck(spec, outcomeFor(score), score, `${seeker.name} prefers ${pref}; ${fact}.${suffix}`),
        );
      }
    }

    // Religion — only if the seeker voluntarily specified a preference.
    if (prefs.religions && prefs.religions.length > 0) {
      const spec = {
        category: CATEGORY,
        id: 'religion',
        label: 'Stated religious preference',
        direction,
        weight: 1.5,
      };
      const religion = other.person.background.religion;
      if (!religion) {
        checks.push(
          makeCheck(
            spec,
            'unknown',
            null,
            `${seeker.name} stated a religious preference; ${other.name} has not shared this.`,
          ),
        );
      } else if (prefs.religions.some((r) => normalizeText(r) === normalizeText(religion))) {
        checks.push(
          makeCheck(
            spec,
            'match',
            1,
            `${other.name}'s stated religion matches ${seeker.name}'s stated preference.`,
          ),
        );
      } else {
        checks.push(
          makeCheck(
            spec,
            'conflict',
            0.2,
            `${seeker.name} stated a preference for ${listText(prefs.religions)}; ${other.name}'s stated religion differs.`,
          ),
        );
      }
    }
  }

  return checks;
}
