import type { CheckResult, Diet, FamilyValues, HabitFrequency, YesNoMaybe } from '@tdc/shared';
import { DIET_LABELS, FAMILY_VALUES_LABELS } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, type PairContext } from '../context';
import { intersect, listText } from '../utils';

const CATEGORY = 'lifestyleValues' as const;

/** Stricter vegetarian diets satisfy a "vegetarian" preference. */
const VEG_COMPATIBLE: Diet[] = ['vegetarian', 'jain', 'vegan'];

/** acceptance → frequency → score. Smoking is penalised more strongly than drinking. */
const SMOKING_SCORES: Record<YesNoMaybe, Record<Exclude<HabitFrequency, 'never'>, number>> = {
  yes: { occasionally: 1, regularly: 0.9 },
  maybe: { occasionally: 0.6, regularly: 0.4 },
  no: { occasionally: 0.1, regularly: 0 },
};
const DRINKING_SCORES: Record<YesNoMaybe, Record<Exclude<HabitFrequency, 'never'>, number>> = {
  yes: { occasionally: 1, regularly: 0.9 },
  maybe: { occasionally: 0.8, regularly: 0.4 },
  no: { occasionally: 0.3, regularly: 0 },
};

const VALUES_ORDER: FamilyValues[] = ['traditional', 'moderate', 'liberal'];

export function lifestyleChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];
  const { customer: a, candidate: b } = pair;

  for (const { seeker, other, direction } of directions(pair)) {
    const prefs = seeker.person.preferences;
    const life = other.person.lifestyle;

    // Diet.
    const dietSpec = { category: CATEGORY, id: 'diet', label: 'Diet preference', direction, weight: 2 };
    if (prefs.diets == null) {
      checks.push(makeCheck(dietSpec, 'unknown', null, `${seeker.name} has not stated a diet preference.`));
    } else if (prefs.diets.length === 0) {
      // Explicitly no diet preference: nothing to check.
    } else if (!life.diet) {
      checks.push(makeCheck(dietSpec, 'unknown', null, `${other.name}'s diet is not recorded.`));
    } else if (prefs.diets.includes(life.diet)) {
      checks.push(
        makeCheck(
          dietSpec,
          'match',
          1,
          `${other.name} is ${DIET_LABELS[life.diet].toLowerCase()}, matching ${seeker.name}'s preference.`,
        ),
      );
    } else if (prefs.diets.includes('vegetarian') && VEG_COMPATIBLE.includes(life.diet)) {
      checks.push(
        makeCheck(
          dietSpec,
          'match',
          0.9,
          `${other.name} is ${DIET_LABELS[life.diet].toLowerCase()}, compatible with ${seeker.name}'s vegetarian preference.`,
        ),
      );
    } else {
      checks.push(
        makeCheck(
          dietSpec,
          'conflict',
          0.2,
          `${seeker.name} prefers ${listText(prefs.diets.map((d) => DIET_LABELS[d].toLowerCase()))}; ${other.name} is ${DIET_LABELS[life.diet].toLowerCase()}.`,
        ),
      );
    }

    // Smoking and drinking.
    for (const habit of ['smoking', 'drinking'] as const) {
      const spec = {
        category: CATEGORY,
        id: habit,
        label: habit === 'smoking' ? 'Smoking' : 'Drinking',
        direction,
        weight: habit === 'smoking' ? 1.5 : 1,
      };
      const accepts = habit === 'smoking' ? prefs.acceptsSmoking : prefs.acceptsDrinking;
      const freq = life[habit];
      const verb = habit === 'smoking' ? 'smoke' : 'drink';
      if (accepts === 'yes') continue; // Fully accepting: the habit cannot conflict, so no evidence either way.
      if (!freq) {
        checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s ${habit} habits are not recorded.`));
      } else if (freq === 'never') {
        checks.push(makeCheck(spec, 'match', 1, `${other.name} does not ${verb}.`));
      } else if (!accepts) {
        checks.push(
          makeCheck(
            spec,
            'unknown',
            null,
            `${other.name} ${verb}s ${freq}; ${seeker.name}'s view is not stated.`,
          ),
        );
      } else {
        const score = (habit === 'smoking' ? SMOKING_SCORES : DRINKING_SCORES)[accepts][freq];
        const stance = accepts === 'maybe' ? 'is unsure about it' : `prefers a partner who doesn't ${verb}`;
        checks.push(
          makeCheck(
            spec,
            outcomeFor(score),
            score,
            `${other.name} ${verb}s ${freq}; ${seeker.name} ${stance}.`,
          ),
        );
      }
    }

    // Pets — only relevant when the other person has pets.
    if (life.pets === 'has_pets') {
      const spec = { category: CATEGORY, id: 'pets', label: 'Pets', direction, weight: 1 };
      const open = prefs.openToPets;
      if (!open) {
        checks.push(
          makeCheck(
            spec,
            'unknown',
            null,
            `${other.name} has pets; ${seeker.name}'s openness to pets is not stated.`,
          ),
        );
      } else {
        const score = open === 'yes' ? 1 : open === 'maybe' ? 0.6 : 0;
        const stance =
          open === 'yes'
            ? 'is happy with pets'
            : open === 'maybe'
              ? 'may be open to pets'
              : 'prefers no pets';
        checks.push(
          makeCheck(
            spec,
            score === 0 ? 'conflict' : outcomeFor(score),
            score,
            `${other.name} has pets; ${seeker.name} ${stance}.`,
          ),
        );
      }
    }
  }

  // Family values (mutual).
  const fvSpec = {
    category: CATEGORY,
    id: 'familyValues',
    label: 'Family values',
    direction: 'mutual',
    weight: 2,
  } as const;
  const fa = a.person.background.familyValues;
  const fb = b.person.background.familyValues;
  if (!fa || !fb) {
    checks.push(makeCheck(fvSpec, 'unknown', null, 'Family values not recorded for both.'));
  } else {
    const gap = Math.abs(VALUES_ORDER.indexOf(fa) - VALUES_ORDER.indexOf(fb));
    const score = gap === 0 ? 1 : gap === 1 ? 0.6 : 0.2;
    const detail =
      gap === 0
        ? `Both describe their family values as ${FAMILY_VALUES_LABELS[fa].toLowerCase()}.`
        : `${a.name}'s family values are ${FAMILY_VALUES_LABELS[fa].toLowerCase()}; ${b.name}'s are ${FAMILY_VALUES_LABELS[fb].toLowerCase()}.`;
    checks.push(makeCheck(fvSpec, outcomeFor(score), score, detail));
  }

  // Important personal values (mutual overlap).
  const vSpec = {
    category: CATEGORY,
    id: 'values',
    label: 'Important values',
    direction: 'mutual',
    weight: 2,
  } as const;
  const va = a.person.preferences.values;
  const vb = b.person.preferences.values;
  if (va.length === 0 || vb.length === 0) {
    checks.push(makeCheck(vSpec, 'unknown', null, 'Important values not listed by both.'));
  } else {
    const shared = intersect(va, vb);
    const score = shared.length >= 2 ? 1 : shared.length === 1 ? 0.7 : 0.35;
    const detail =
      shared.length >= 2
        ? `Both list ${listText(shared.map((s) => s.toLowerCase()))} among their important values.`
        : shared.length === 1
          ? `Only one important value in common (${shared[0]!.toLowerCase()}).`
          : `No overlap in listed values (${a.name}: ${listText(va.map((s) => s.toLowerCase()))}; ${b.name}: ${listText(vb.map((s) => s.toLowerCase()))}).`;
    checks.push(makeCheck(vSpec, outcomeFor(score), score, detail));
  }

  return checks;
}
