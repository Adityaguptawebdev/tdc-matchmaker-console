import type { CheckResult } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, type PairContext } from '../context';
import { intersect, listText, normalizeText } from '../utils';

const CATEGORY = 'languageInterests' as const;

export function languageChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];
  const { customer: a, candidate: b } = pair;
  const la = a.person.background.languages;
  const lb = b.person.background.languages;

  const langSpec = {
    category: CATEGORY,
    id: 'shared',
    label: 'Shared languages',
    direction: 'mutual',
    weight: 2,
  } as const;
  if (la.length === 0 || lb.length === 0) {
    checks.push(makeCheck(langSpec, 'unknown', null, 'Languages not listed by both.'));
  } else {
    // Nearly everyone in the pool lists English, so English alone is a weaker signal than a shared
    // mother tongue or regional language.
    const shared = intersect(la, lb);
    const beyondEnglish = shared.filter((l) => normalizeText(l) !== 'english');
    if (beyondEnglish.length > 0)
      checks.push(makeCheck(langSpec, 'match', 1, `Both speak ${listText(shared)}.`));
    else if (shared.length > 0)
      checks.push(makeCheck(langSpec, 'partial', 0.7, 'Both speak English; no other language in common.'));
    else checks.push(makeCheck(langSpec, 'conflict', 0.1, 'No common language listed.'));
  }

  // Preferred partner languages (optional preference).
  for (const { seeker, other, direction } of directions(pair)) {
    const preferred = seeker.person.preferences.languages;
    if (!preferred || preferred.length === 0) continue;
    const spec = { category: CATEGORY, id: 'preferred', label: 'Preferred languages', direction, weight: 1 };
    const spoken = other.person.background.languages;
    if (spoken.length === 0) {
      checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s languages are not listed.`));
      continue;
    }
    const hit = intersect(preferred, spoken);
    checks.push(
      hit.length > 0
        ? makeCheck(spec, 'match', 1, `${other.name} speaks ${listText(hit)}, which ${seeker.name} prefers.`)
        : makeCheck(
            spec,
            'partial',
            0.3,
            `${seeker.name} prefers a partner who speaks ${listText(preferred)}; ${other.name} does not list ${preferred.length > 1 ? 'them' : 'it'}.`,
          ),
    );
  }

  const intSpec = {
    category: CATEGORY,
    id: 'interests',
    label: 'Shared interests',
    direction: 'mutual',
    weight: 2,
  } as const;
  const ia = a.person.lifestyle.interests;
  const ib = b.person.lifestyle.interests;
  if (ia.length === 0 || ib.length === 0) {
    checks.push(makeCheck(intSpec, 'unknown', null, 'Interests not listed by both.'));
  } else {
    const shared = intersect(ia, ib);
    const score = shared.length >= 3 ? 1 : shared.length === 2 ? 0.8 : shared.length === 1 ? 0.6 : 0.3;
    checks.push(
      makeCheck(
        intSpec,
        outcomeFor(score),
        score,
        shared.length >= 3
          ? `Shared interests: ${listText(shared.map((s) => s.toLowerCase()))}.`
          : shared.length === 2
            ? `Two shared interests: ${listText(shared.map((s) => s.toLowerCase()))}.`
            : shared.length === 1
              ? `Only one shared interest listed (${shared[0]!.toLowerCase()}).`
              : 'No shared interests listed.',
      ),
    );
  }

  return checks;
}
