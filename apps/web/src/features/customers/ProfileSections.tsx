import type { ReactNode } from 'react';
import { Ban, Info } from 'lucide-react';
import type { Contact, Profile, YesNoMaybe } from '@tdc/shared';
import {
  DEAL_BREAKER_LABELS,
  DIET_LABELS,
  EDUCATION_LEVEL_LABELS,
  FAMILY_TYPE_LABELS,
  FAMILY_VALUES_LABELS,
  GENDER_LABELS,
  HABIT_LABELS,
  MARITAL_STATUS_LABELS,
  MARRIAGE_TIMELINE_LABELS,
  PET_STATUS_LABELS,
  PROFESSION_CATEGORY_LABELS,
  RELATIVE_AGE_LABELS,
  RELATIVE_HEIGHT_LABELS,
  RELATIVE_INCOME_LABELS,
  formatHeight,
} from '@tdc/shared';
import { VerificationBadge } from '../../components/StatusBadges';
import { Badge } from '../../components/ui/Badge';
import { Detail } from '../../components/ui/Layout';
import {
  cn,
  formatDate,
  formatDob,
  formatIncome,
  formatRange,
  listOrOpen,
  orDash,
  yesNoMaybe,
} from '../../lib/format';

export type ProfileView = Omit<Profile, 'contact' | 'matchmaking'> & {
  age: number | null;
  contact?: Contact;
};

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

const Chips = ({ items, empty = 'None listed' }: { items: string[]; empty?: string }) =>
  items.length === 0 ? (
    <span className="text-stone-500">{empty}</span>
  ) : (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Badge key={i} tone="neutral">
          {i}
        </Badge>
      ))}
    </span>
  );

function YnmPill({ value }: { value: YesNoMaybe | null }) {
  const tone = value === 'yes' ? 'green' : value === 'no' ? 'rose' : value === 'maybe' ? 'amber' : 'neutral';
  return <Badge tone={tone}>{yesNoMaybe(value)}</Badge>;
}

export function PersonalSection({ p }: { p: ProfileView }) {
  return (
    <Section title="Personal details">
      <Detail label="First name">{p.firstName}</Detail>
      <Detail label="Last name">{p.lastName}</Detail>
      <Detail label="Gender">{p.gender ? GENDER_LABELS[p.gender] : 'Not recorded'}</Detail>
      <Detail label="Date of birth">{formatDob(p.dateOfBirth)}</Detail>
      <Detail label="Age">{p.age !== null ? `${p.age} years (computed)` : 'Unknown'}</Detail>
      <Detail label="Height">{formatHeight(p.heightCm)}</Detail>
      <Detail label="City">{orDash(p.city)}</Detail>
      <Detail label="Country">{orDash(p.country)}</Detail>
      <Detail label="Verification">
        <span className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={p.verification.status} />
          {p.verification.verifiedAt && (
            <span className="text-xs text-stone-500">{formatDate(p.verification.verifiedAt)}</span>
          )}
        </span>
      </Detail>
      {p.contact && (
        <>
          <Detail label="Email">
            {p.contact.email ? (
              <a href={`mailto:${p.contact.email}`} className="text-brand-700 hover:underline">
                {p.contact.email}
              </a>
            ) : (
              '—'
            )}
          </Detail>
          <Detail label="Phone">{orDash(p.contact.phone)}</Detail>
        </>
      )}
      {p.verification.method && <Detail label="Verification method">{p.verification.method}</Detail>}
      {p.about && (
        <Detail label="About" className="sm:col-span-2 lg:col-span-3">
          <span className="leading-relaxed text-stone-700">{p.about}</span>
        </Detail>
      )}
    </Section>
  );
}

export function CareerSection({ p }: { p: ProfileView }) {
  const { education: e, career: c } = p;
  return (
    <Section title="Education & career">
      <Detail label="Undergraduate / college">{orDash(e.college)}</Detail>
      <Detail label="Degree">{orDash(e.degree)}</Detail>
      <Detail label="Education level">{e.level ? EDUCATION_LEVEL_LABELS[e.level] : '—'}</Detail>
      <Detail label="Current company">{orDash(c.company)}</Detail>
      <Detail label="Designation">{orDash(c.designation)}</Detail>
      <Detail label="Profession">
        {orDash(c.profession)}
        {c.professionCategory && (
          <span className="text-stone-500"> · {PROFESSION_CATEGORY_LABELS[c.professionCategory]}</span>
        )}
      </Detail>
      <Detail label="Income">
        {formatIncome(c.income)}
        {c.income && <span className="ml-1 text-xs text-stone-500">({c.income.currency})</span>}
      </Detail>
      <Detail label="Work location">{orDash(c.workLocation)}</Detail>
      <Detail label="Career goals" className="sm:col-span-2 lg:col-span-1">
        {orDash(c.careerGoals)}
      </Detail>
    </Section>
  );
}

export function BackgroundSection({ p }: { p: ProfileView }) {
  const b = p.background;
  return (
    <Section
      title="Family & background"
      note="Religion and community are shown only where the member chose to share them."
    >
      <Detail label="Marital status">{b.maritalStatus ? MARITAL_STATUS_LABELS[b.maritalStatus] : '—'}</Detail>
      <Detail label="Religion">
        {b.religion ?? <span className="text-stone-500">Prefers not to say</span>}
      </Detail>
      <Detail label="Community / sub-community">
        {b.community ? (
          `${b.community}${b.subCommunity ? ` · ${b.subCommunity}` : ''}`
        ) : (
          <span className="text-stone-500">Not shared</span>
        )}
      </Detail>
      <Detail label="Mother tongue">{orDash(b.motherTongue)}</Detail>
      <Detail label="Languages known" className="sm:col-span-2">
        <Chips items={b.languages} />
      </Detail>
      <Detail label="Family type">{b.familyType ? FAMILY_TYPE_LABELS[b.familyType] : '—'}</Detail>
      <Detail label="Family values">{b.familyValues ? FAMILY_VALUES_LABELS[b.familyValues] : '—'}</Detail>
      <Detail label="Siblings">
        {b.siblings
          ? (b.siblings.details ?? `${b.siblings.brothers} brothers, ${b.siblings.sisters} sisters`)
          : '—'}
      </Detail>
      <Detail label="Family background" className="sm:col-span-2 lg:col-span-3">
        {orDash(b.familyBackground)}
      </Detail>
    </Section>
  );
}

export function LifestyleSection({ p }: { p: ProfileView }) {
  const l = p.lifestyle;
  return (
    <Section title="Lifestyle">
      <Detail label="Diet">{l.diet ? DIET_LABELS[l.diet] : '—'}</Detail>
      <Detail label="Smoking">{l.smoking ? HABIT_LABELS[l.smoking] : '—'}</Detail>
      <Detail label="Drinking">{l.drinking ? HABIT_LABELS[l.drinking] : '—'}</Detail>
      <Detail label="Pets">{l.pets ? PET_STATUS_LABELS[l.pets] : '—'}</Detail>
      <Detail label="Hobbies & interests" className="sm:col-span-2">
        <Chips items={l.interests} />
      </Detail>
    </Section>
  );
}

/**
 * Relationship preferences. For male customers, unstated relative preferences show that the configured
 * assignment default applies — the UI never hides that an assumption is being made.
 */
export function PreferencesSection({
  p,
  isCustomer,
  assignmentDefaults = true,
}: {
  p: ProfileView;
  isCustomer?: boolean;
  assignmentDefaults?: boolean;
}) {
  const pr = p.preferences;
  const defaultHint = (stated: string | null, fallback: string) =>
    stated ? null : isCustomer && assignmentDefaults && p.gender === 'male' ? (
      <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
        <Info className="h-3 w-3" aria-hidden /> Not stated · default rule “{fallback}” applies
      </span>
    ) : null;
  return (
    <div className="space-y-4">
      <Section title="Relationship goals">
        <Detail label="Wants children">
          <YnmPill value={pr.wantsChildren} />
        </Detail>
        <Detail label="Open to relocation">
          <YnmPill value={pr.openToRelocation} />
        </Detail>
        <Detail label="Open to pets">
          <YnmPill value={pr.openToPets} />
        </Detail>
        <Detail label="Marriage timeline">
          {pr.marriageTimeline ? MARRIAGE_TIMELINE_LABELS[pr.marriageTimeline] : 'Not stated'}
        </Detail>
      </Section>

      <Section
        title="Partner preferences"
        note="“Open to any” means explicitly no restriction; “Not stated” is treated as unknown by the matching engine."
      >
        <Detail label="Preferred age range">{formatRange(pr.ageRange, ' years')}</Detail>
        <Detail label="Preferred height range">{formatRange(pr.heightRangeCm, ' cm')}</Detail>
        <Detail label="Relative age">
          {pr.partnerAgeRelation ? RELATIVE_AGE_LABELS[pr.partnerAgeRelation] : 'Not stated'}
          {defaultHint(pr.partnerAgeRelation, 'younger')}
        </Detail>
        <Detail label="Relative height">
          {pr.partnerHeightRelation ? RELATIVE_HEIGHT_LABELS[pr.partnerHeightRelation] : 'Not stated'}
          {defaultHint(pr.partnerHeightRelation, 'shorter')}
        </Detail>
        <Detail label="Relative income">
          {pr.partnerIncomeRelation ? RELATIVE_INCOME_LABELS[pr.partnerIncomeRelation] : 'Not stated'}
          {defaultHint(pr.partnerIncomeRelation, 'earns less')}
        </Detail>
        <Detail label="Preferred locations">{listOrOpen(pr.locations)}</Detail>
        <Detail label="Minimum education">
          {pr.minEducationLevel ? `${EDUCATION_LEVEL_LABELS[pr.minEducationLevel]} or above` : 'Not stated'}
        </Detail>
        <Detail label="Preferred professions">
          {listOrOpen(pr.professions, PROFESSION_CATEGORY_LABELS)}
        </Detail>
        <Detail label="Marital status accepted">
          {listOrOpen(pr.maritalStatuses, MARITAL_STATUS_LABELS)}
        </Detail>
      </Section>

      <Section title="Lifestyle & cultural preferences">
        <Detail label="Partner diet">{listOrOpen(pr.diets, DIET_LABELS)}</Detail>
        <Detail label="Partner smoking">
          {pr.acceptsSmoking
            ? { yes: 'Fine with it', maybe: 'Unsure', no: 'Prefers non-smoker' }[pr.acceptsSmoking]
            : 'Not stated'}
        </Detail>
        <Detail label="Partner drinking">
          {pr.acceptsDrinking
            ? { yes: 'Fine with it', maybe: 'Unsure', no: 'Prefers non-drinker' }[pr.acceptsDrinking]
            : 'Not stated'}
        </Detail>
        <Detail label="Preferred languages">{listOrOpen(pr.languages)}</Detail>
        <Detail label="Religion preference (voluntary)">
          {pr.religions?.length ? pr.religions.join(', ') : 'None specified'}
        </Detail>
        <Detail label="Community preference (voluntary)">
          {pr.communities?.length ? (
            <>
              {pr.communities.join(', ')}
              <span className="mt-0.5 block text-xs text-stone-500">
                Shown for context only — never used in scoring.
              </span>
            </>
          ) : (
            'None specified'
          )}
        </Detail>
        <Detail label="Important values" className="sm:col-span-2 lg:col-span-3">
          <Chips items={pr.values} />
        </Detail>
      </Section>

      <section className={cn('card p-5', pr.dealBreakers.length > 0 && 'border-rose-200')}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Ban className="h-4 w-4 text-rose-600" aria-hidden /> Deal-breakers
        </h3>
        <p className="mt-1 text-xs text-stone-500">
          Structured deal-breakers are enforced by the matching engine in both directions. Notes are for
          matchmaker judgement only.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pr.dealBreakers.length ? (
            pr.dealBreakers.map((d) => (
              <Badge key={d} tone="rose">
                {DEAL_BREAKER_LABELS[d]}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-stone-500">None specified</span>
          )}
        </div>
        {pr.dealBreakerNotes && (
          <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            “{pr.dealBreakerNotes}”
          </p>
        )}
      </section>
    </div>
  );
}
