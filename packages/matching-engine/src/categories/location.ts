import type { CheckResult, YesNoMaybe } from '@tdc/shared';
import { directions, makeCheck, type PairContext } from '../context';
import { containsCity, listText, normalizeCity } from '../utils';

const CATEGORY = 'location' as const;

/** How far a willingness to relocate compensates for not living in a preferred city. */
const RELOCATION_COMPENSATION: Record<YesNoMaybe, number> = { yes: 0.8, maybe: 0.5, no: 0.1 };

export function locationChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];
  const { customer: a, candidate: b } = pair;

  for (const { seeker, other, direction } of directions(pair)) {
    const spec = { category: CATEGORY, id: 'preferred', label: 'Preferred locations', direction, weight: 3 };
    const preferred = seeker.person.preferences.locations;
    const city = other.person.city;
    if (preferred == null) {
      checks.push(makeCheck(spec, 'unknown', null, `${seeker.name} has not stated location preferences.`));
    } else if (preferred.length === 0) {
      continue; // Explicitly open to any location: no constraint to check.
    } else if (!city) {
      checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s city is not recorded.`));
    } else if (containsCity(preferred, city)) {
      checks.push(
        makeCheck(
          spec,
          'match',
          1,
          `${other.name} lives in ${city}, one of ${seeker.name}'s preferred locations.`,
        ),
      );
    } else {
      const reloc = other.person.preferences.openToRelocation;
      const base = `${other.name} lives in ${city}, outside ${seeker.name}'s preferred ${listText(preferred)}`;
      if (!reloc) {
        checks.push(
          makeCheck(spec, 'partial', 0.4, `${base}; ${other.name}'s openness to relocation is not stated.`),
        );
      } else {
        const score = RELOCATION_COMPENSATION[reloc];
        const tail =
          reloc === 'yes'
            ? 'but is open to relocating'
            : reloc === 'maybe'
              ? 'and may consider relocating'
              : 'and does not wish to relocate';
        checks.push(makeCheck(spec, reloc === 'no' ? 'conflict' : 'partial', score, `${base} ${tail}.`));
      }
    }
  }

  // Relocation feasibility: can two people in different cities realistically end up in one place?
  const spec = {
    category: CATEGORY,
    id: 'relocation',
    label: 'Relocation feasibility',
    direction: 'mutual',
    weight: 2,
  } as const;
  const ca = normalizeCity(a.person.city);
  const cb = normalizeCity(b.person.city);
  if (!ca || !cb) {
    checks.push(makeCheck(spec, 'unknown', null, 'City not recorded for both people.'));
  } else if (ca === cb) {
    checks.push(makeCheck(spec, 'match', 1, `Both live in ${a.person.city}, so no relocation is needed.`));
  } else {
    const ra = a.person.preferences.openToRelocation;
    const rb = b.person.preferences.openToRelocation;
    const willing = [ra === 'yes' ? a.name : null, rb === 'yes' ? b.name : null].filter(Boolean) as string[];
    const maybe = [ra === 'maybe' ? a.name : null, rb === 'maybe' ? b.name : null].filter(
      Boolean,
    ) as string[];
    const where = `${a.name} is in ${a.person.city} and ${b.name} is in ${b.person.city}`;
    if (willing.length > 0) {
      checks.push(
        makeCheck(
          spec,
          'match',
          1,
          `${where}; ${listText(willing)} ${willing.length > 1 ? 'are' : 'is'} open to relocating.`,
        ),
      );
    } else if (maybe.length > 0) {
      checks.push(makeCheck(spec, 'partial', 0.6, `${where}; ${listText(maybe)} may consider relocating.`));
    } else if (ra === 'no' && rb === 'no') {
      checks.push(makeCheck(spec, 'conflict', 0, `${where}, and neither wishes to relocate.`));
    } else {
      checks.push(makeCheck(spec, 'unknown', null, `${where}; relocation openness is not stated by both.`));
    }
  }

  return checks;
}
