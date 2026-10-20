import type { CheckResult } from '@tdc/shared';
import { EDUCATION_LEVEL_LABELS, EDUCATION_RANK, PROFESSION_CATEGORY_LABELS } from '@tdc/shared';
import { directions, makeCheck, outcomeFor, resolveRelation, type PairContext } from '../context';
import { formatMoney, listText, toINR } from '../utils';

const CATEGORY = 'careerEducation' as const;

export function careerChecks(pair: PairContext): CheckResult[] {
  const checks: CheckResult[] = [];

  for (const { seeker, other, direction } of directions(pair)) {
    const prefs = seeker.person.preferences;

    // Minimum education (optional preference: only checked when stated).
    if (prefs.minEducationLevel) {
      const spec = {
        category: CATEGORY,
        id: 'education',
        label: 'Education preference',
        direction,
        weight: 2,
      };
      const level = other.person.education.level;
      const wanted = EDUCATION_LEVEL_LABELS[prefs.minEducationLevel];
      if (!level) {
        checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s education level is not recorded.`));
      } else {
        const gap = EDUCATION_RANK[prefs.minEducationLevel] - EDUCATION_RANK[level];
        const degree = other.person.education.degree ?? EDUCATION_LEVEL_LABELS[level];
        if (gap <= 0) {
          checks.push(
            makeCheck(
              spec,
              'match',
              1,
              `${other.name} holds ${degree}, meeting ${seeker.name}'s preference (${wanted} or above).`,
            ),
          );
        } else {
          const score = gap === 1 ? 0.4 : 0.1;
          checks.push(
            makeCheck(
              spec,
              outcomeFor(score),
              score,
              `${seeker.name} prefers ${wanted} or above; ${other.name} holds ${degree}.`,
            ),
          );
        }
      }
    }

    // Profession preference (optional; [] means explicitly open).
    if (prefs.professions && prefs.professions.length > 0) {
      const spec = {
        category: CATEGORY,
        id: 'profession',
        label: 'Profession preference',
        direction,
        weight: 2,
      };
      const cat = other.person.career.professionCategory;
      if (!cat) {
        checks.push(makeCheck(spec, 'unknown', null, `${other.name}'s profession is not recorded.`));
      } else if (prefs.professions.includes(cat)) {
        checks.push(
          makeCheck(
            spec,
            'match',
            1,
            `${other.name} works in ${PROFESSION_CATEGORY_LABELS[cat].toLowerCase()}${other.person.career.profession ? ` (${other.person.career.profession})` : ''}, one of ${seeker.name}'s preferred fields.`,
          ),
        );
      } else {
        checks.push(
          makeCheck(
            spec,
            'partial',
            0.3,
            `${seeker.name} prefers ${listText(prefs.professions.map((p) => PROFESSION_CATEGORY_LABELS[p].toLowerCase()))}; ${other.name} works in ${PROFESSION_CATEGORY_LABELS[cat].toLowerCase()}.`,
          ),
        );
      }
    }

    // Relative income preference (stated, or assignment default for the customer).
    const rel = resolveRelation(seeker, 'partnerIncomeRelation', pair.config);
    if (rel && rel.value !== 'no_preference') {
      const spec = {
        category: CATEGORY,
        id: 'income',
        label: 'Relative income preference',
        direction,
        weight: 2,
        source: rel.source,
      };
      const suffix = rel.source === 'default_rule' ? ' (assignment default rule)' : '';
      const mine = seeker.person.career.income;
      const theirs = other.person.career.income;
      if (!mine || !theirs) {
        checks.push(
          makeCheck(
            spec,
            'unknown',
            null,
            `Income not recorded for both, so relative income cannot be compared.${suffix}`,
          ),
        );
      } else {
        const ratio = toINR(theirs, pair.config) / Math.max(1, toINR(mine, pair.config));
        const comparison =
          ratio < 0.95 ? 'earns less than' : ratio > 1.05 ? 'earns more than' : 'earns about the same as';
        const facts = `${other.name} ${comparison} ${seeker.name} (${formatMoney(theirs)} vs ${formatMoney(mine)})`;
        let score: number;
        let pref: string;
        if (rel.value === 'lower') {
          score = ratio <= 0.95 ? 1 : ratio <= 1.1 ? 0.7 : 0.3;
          pref = 'a partner who earns less';
        } else if (rel.value === 'higher') {
          score = ratio >= 1.05 ? 1 : ratio >= 0.9 ? 0.7 : 0.3;
          pref = 'a partner who earns more';
        } else {
          score = ratio >= 0.7 && ratio <= 1.43 ? 1 : ratio >= 0.5 && ratio <= 2 ? 0.6 : 0.3;
          pref = 'a partner with similar income';
        }
        checks.push(
          makeCheck(spec, outcomeFor(score), score, `${seeker.name} prefers ${pref}; ${facts}.${suffix}`),
        );
      }
    }
  }

  return checks;
}
