# Matching Algorithm — Design & Rationale

**Engine:** `@tdc/matching-engine` v1.0.0 (`packages/matching-engine`) · **Config:** `packages/matching-engine/src/config.ts`

The engine is a set of pure TypeScript functions with no I/O, clock, randomness, Express, MongoDB or React. The caller passes `now`, so the same input always produces the same output. The API (`apps/api/src/services/matching.service.ts`) loads profiles and history and calls the engine. The optional AI layer only rephrases what the engine produced.

```
            ┌─────────────────────────── @tdc/matching-engine ───────────────────────────┐
profiles ──►│ checkEligibility ──► evaluateChecks (7 categories) ──► scoreCompatibility │──► MatchBreakdown
history  ──►│   (hard rules)         forward / reverse / mutual        evidence, cap,    │      + deterministic
            │                                                          band, confidence │        explanation
            │ rankCandidates: eligibility → score → min-score filter → deterministic sort│
            └────────────────────────────────────────────────────────────────────────────┘
                                                   │ facts only (no contact data, no scores)
                                                   ▼
                              AI layer (optional): rephrase facts, validated, else fallback
```

---

## 1. AI integration

|           |                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where     | `apps/api/src/services/ai.service.ts`, server-side only. The key is read from `OPENAI_API_KEY` and is never sent to the browser.                            |
| Interface | `generateMatchExplanation(customer, candidate, breakdown)` and `generateIntroduction(customer, candidate, { breakdown, matchmakerName })`                   |
| Model     | `OPENAI_MODEL` (default `gpt-4o-mini`), timeout `OPENAI_TIMEOUT_MS`, one retry                                                                              |
| Output    | Structured outputs (`response_format: json_schema`, `strict: true`), then validated again with Zod                                                          |
| Role      | **Rephrasing only.** Eligibility, scores, bands and ranking come from the deterministic engine. The model never sees the score number and cannot change it. |

**What the model receives.** The model gets first names only, the band label, the confidence level, and a numbered list of facts (`F1…Fn`). Those facts are the engine's own check texts. Income amounts are redacted from them, so the model sees "earns less than" rather than figures. For introductions it also gets a minimal candidate summary: first name, age, city, profession, designation, degree and listed interests.

**What is never sent.** Email addresses, phone numbers, surnames, income figures, religion, caste/community and free-text "about" fields are never sent.

**Anti-fabrication guards.** Each check below fails over to the deterministic text:

- Every highlight or consideration must cite a supplied `factId` of the right kind (strength vs. consideration/unknown). A fact id the engine didn't supply means fallback.
- Summaries mentioning `%` or `n/100` are rejected, because the model must not restate scores.
- Introductions must name the candidate, must not contain the candidate's surname, and must not contain anything that looks like an email address or phone number.
- Invalid JSON, schema violations, timeouts, refusals, network errors or a missing key all trigger the fallback.

**Labelling.** Every response carries `source: 'ai' | 'fallback'`, the model name, and a `fallbackReason`. The UI shows "AI-generated · model" or "Deterministic fallback" next to the text. Introductions the matchmaker edits are recorded as `introductionSource: 'edited'`.

**Deterministic fallback.**

- The explanation uses the engine's own headline, strengths, considerations and unknowns (`packages/matching-engine/src/explanation.ts`). Each sentence is built from profile fields.
- The introduction is a template filled with the candidate's first name, age, role and city, plus up to three _mutual_ matched facts (`fallbackIntroduction` in `ai.service.ts`).

**Tests.** `apps/api/src/tests/api.test.ts` injects a fake OpenAI client. It checks that valid cited output is accepted. It also checks that an uncited fact, invalid JSON, a timeout, and a phone number in a draft each fall back.

---

## 2. Algorithm design and score calculation

### 2.1 Eligibility (hard rules, `eligibility.ts`)

Eligibility is checked before any scoring. Every failing reason is collected and returned, so exclusions are never silent. The UI shows per-reason counts and the exact reasons for any single candidate.

| Code                                                               | Rule                                                                                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SAME_PROFILE`                                                     | Candidate is the customer.                                                                                                                                                        |
| `DUPLICATE_CANDIDATE`                                              | The same id appears twice in the pool; the first is kept and the pool is sorted by id first, so this is order-independent.                                                        |
| `INACTIVE_PROFILE`                                                 | Candidate status is `paused` or `engaged`.                                                                                                                                        |
| `GENDER_RULE`                                                      | `genderRule: 'opposite'` (configurable; `'any'` disables it).                                                                                                                     |
| `GENDER_UNKNOWN`                                                   | Gender missing, so the configured rule cannot be applied. The profile is flagged "needs review", not hidden silently.                                                             |
| `MISSING_DATE_OF_BIRTH` / `BELOW_MINIMUM_AGE`                      | Legal minimum age (21 male / 18 female, Prohibition of Child Marriage Act 2006) must be verifiable. This is the one field whose absence excludes, for legal reasons.              |
| `ALREADY_SENT` / `PREVIOUSLY_REJECTED` / `DISMISSED_BY_MATCHMAKER` | Pair history, checked **in both directions**: if the customer was ever introduced as a candidate to this person, that also counts. Each rule can be toggled in `exclusionPolicy`. |
| `CUSTOMER_DEAL_BREAKER` / `CANDIDATE_DEAL_BREAKER`                 | Structured deal-breakers, enforced **for both people**.                                                                                                                           |

Deal-breakers are structured enums so they can be enforced deterministically: `smoker`, `drinks_regularly`, `non_vegetarian`, `age_outside_range`, `height_outside_range`, `children_mismatch`, `unwilling_to_relocate`, `previously_married`, `different_religion`, `unverified_profile`.

If the data needed to check a deal-breaker is missing, the candidate is **not excluded**. Instead a warning is shown: _"Farhan's deal-breaker 'Partner smokes' could not be verified: Ishita's smoking habits are not recorded."_ Free-text `dealBreakerNotes` are shown to the matchmaker but never machine-enforced.

Duplicate sends are also blocked at the write layer, independently of ranking:

- an order-independent unique `pairKey` index in MongoDB, with the same constraint in the file/memory stores;
- an in-process in-flight lock;
- server-side `confirm: true`;
- a disabled button plus a ref guard in the UI.

### 2.2 Checks

Each of the seven category evaluators (`categories/*.ts`) produces **checks**. A check has:

- `direction`:
  - `forward`: does the candidate meet the _customer's_ stated preference?
  - `reverse`: does the customer meet the _candidate's_ stated preference?
  - `mutual`: a symmetric comparison, e.g. shared language.
- `score` from 0 to 1, or `null` when unknown.
- `outcome`: `match` (≥ 0.85), `partial` (0.3–0.85), `conflict` (< 0.3), or `unknown`.
- `weight`: relative weight within its category.
- `source`:
  - `stated`: the person stated it;
  - `default_rule`: an assignment default was applied, see §3;
  - `derived`: computed from profile facts.
- `detail`: one sentence built only from profile fields, e.g. _"Simran (30) is within Arjun's preferred 26–32."_

| Category                      | Checks (weight)                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relationship goals & children | children views, mutual (3) · marriage timeline, mutual (1.5) · marital-status preference, fwd/rev (1 each)                                                                            |
| Age preferences               | preferred range, fwd/rev (3; ±2-year soft margin = partial) · relative age, fwd/rev (2)                                                                                               |
| Career & education            | minimum education, fwd/rev (2) · profession preference, fwd/rev (2) · relative income, fwd/rev (2; static FX table for non-INR)                                                       |
| Location & relocation         | preferred locations, fwd/rev (3; willingness to relocate partly compensates: yes 0.8 / maybe 0.5 / no 0.1) · relocation feasibility, mutual (2)                                       |
| Lifestyle & values            | diet, fwd/rev (2) · smoking, fwd/rev (1.5) · drinking, fwd/rev (1) · pets, fwd/rev (1, only if the other has pets) · family values, mutual (2) · important values overlap, mutual (2) |
| Language & interests          | shared language, mutual (2; English-only overlap = 0.7) · preferred languages, fwd/rev (1) · shared interests, mutual (2)                                                             |
| Other stated preferences      | height range, fwd/rev (2; ±3 cm soft) · relative height, fwd/rev (1) · religion, fwd/rev (1.5; **only if voluntarily specified**)                                                     |

**Explicit conflicts.** A definite children "yes" vs "no" scores **0** and appears in _Potential conflicts_ (pairs where either person holds `children_mismatch` as a deal-breaker are excluded instead). Other conflicts include living in different cities with neither willing to relocate, an unacceptable diet, and an age outside the preferred range by more than the soft margin.

### 2.3 Missing-data policy

There are three distinct states, and the engine never conflates them:

| State                         | Representation                                                                     | Effect                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Not stated / unknown          | `null`                                                                             | The check is created with `outcome: 'unknown'`, `score: null`. It **reduces evidence** but never counts as a mismatch.                         |
| Explicitly open               | `[]`, or "accepts smoking: yes"                                                    | **No check is created.** There is no constraint, so there is no evidence either way. This stops "open to anything" from inflating every score. |
| Optional preference not given | relative age/income/height, height range, minimum education, professions, religion | No check is created.                                                                                                                           |

**Evidence** for a category is (weight of known checks) ÷ (weight of all its checks). The category score is shrunk toward a neutral 50 in proportion to the missing evidence:

```
raw_c      = Σ(score_i × w_i) / Σ(w_i)          over known checks, × 100
evidence_c = Σ(w_known) / Σ(w_all)
score_c    = 50 + (raw_c − 50) × evidence_c     (no checks known → 50)
```

A category with **no applicable checks** (neither person stated anything relevant) is dropped, and its weight is redistributed proportionally across the remaining categories. The UI shows it as "Not applicable".

### 2.4 Final score

```
weighted   = Σ(W_c × score_c) / Σ(W_c)                       over applicable categories (W = profile weights)
forCustomer  = same formula using only forward + mutual checks
forCandidate = same formula using only reverse + mutual checks
final      = round( min(weighted, min(forCustomer, forCandidate) + mutualityGap) ),  clamped to 0..100
```

**Mutuality cap** (`mutualityGap = 15`). The final score cannot exceed the _weaker_ side's fit by more than 15 points. A candidate whose own stated preferences are poorly met therefore cannot get a high "mutual" score. When the cap fires, a warning explains it. A real example from the seed data: Kavya → Sai has a weighted score of 78.3 and a final score of **75**, because _"Sai's stated preferences are less well met (60/100)"_.

**Confidence.** Overall evidence is the weight-averaged category evidence: ≥ 0.75 is _High_, ≥ 0.5 _Medium_, below that _Limited data_.

**Bands** (configurable `bands`):

| Score  | Band              | Ceiling by confidence             |
| ------ | ----------------- | --------------------------------- |
| 80–100 | High Potential    | requires **high** confidence      |
| 65–79  | Good Potential    | max band at **medium** confidence |
| 50–64  | Explore Further   | max band at **low** confidence    |
| < 50   | Low Compatibility | —                                 |

When a band is lowered because of thin evidence, a warning says so. Only eligible candidates with `score ≥ minRecommendScore` (default **50**, env `MATCHING_MIN_SCORE`) are recommended. The rest are counted as "below threshold".

**Ranking** is by score ↓, then evidence ↓, then candidate id ↑. It is fully deterministic and independent of pool order, which is tested by shuffling the pool. UI filters (city, age, profession, verified-only) narrow the ranked list **without changing any score**.

**Calibration note.** An early version produced 42% "High Potential" across all seeded pairs. That came from "open to anything" checks matching almost everyone, and from English being shared by everyone. Treating explicit openness as "no constraint" and scoring English-only overlap as partial brought this to about 27%, with a real spread down into the 40s. Distribution of the 600 eligible client–candidate pairs in the current seed: 90s 17 · 80s 143 · 70s 245 · 60s 148 · 50s 42 · 40s 5.

---

## 3. Gender-specific requirements and mutual preference handling

The assignment asks that:

- for **male customers**, the engine account for whether the woman is younger, earns less, is shorter, and shares compatible views on children;
- for **female customers**, it account for profession, values, relocation and other relevant factors.

These are implemented as **transparent, configurable assignment rules**. They are not treated as facts about relationships, and they are never applied silently.

```ts
assignmentRules: {
  enabled: true,                                 // env MATCHING_ASSIGNMENT_RULES=false turns everything below off
  relationDefaults: {
    male:   { partnerAgeRelation: 'lower', partnerIncomeRelation: 'lower', partnerHeightRelation: 'lower' },
    female: {},
  },
},
weightProfiles: {
  default:         { relationshipGoals: 25, age: 15, careerEducation: 15, location: 15, lifestyleValues: 15, languageInterests: 10, otherPreferences: 5 },
  male_customer:   /* same as default */,
  female_customer: { relationshipGoals: 22, age: 10, careerEducation: 18, location: 17, lifestyleValues: 18, languageInterests: 10, otherPreferences: 5 },
}
```

**Male customers**

- "Younger", "earns less" and "shorter" are **defaults** that fill in only when the customer has _not_ stated that preference.
- They apply **only to the customer being served**, never to the candidate.
- They are labelled `source: 'default_rule'`. The UI shows a "Default rule" tag on the check, an "Assumptions applied" list, and a hint on the customer's Preferences tab: _Not stated · default rule "younger" applies_.
- **Explicit preferences override them.** A stated `similar`, `higher` or even `no_preference` replaces the default. This is covered by unit tests.
- Views on children sit in the 25%-weight relationship category, and `children_mismatch` is available as a hard deal-breaker.
- The defaults are soft. A candidate who is older, taller or earns more scores 0.15–0.7 on that one check rather than being excluded, and the check carries only 1–2 points of weight within a 5–15% category.

**Female customers**

- No "older / taller / earns more" defaults are imposed. That stereotype was deliberately not mirrored.
- Instead the `female_customer` weight profile raises **career & education** (15 → 18), **lifestyle & values** (15 → 18) and **location & relocation** (15 → 17).
- Profession preferences, values overlap and relocation feasibility therefore carry more weight. This reflects the brief's emphasis on profession, values and relocation.
- Any relative preference a female customer _states_ is scored exactly like anyone else's.

**Both parties matter**

- Every preference is checked in both directions (forward/reverse).
- Deal-breakers are enforced for both people.
- The mutuality cap limits one-sided matches.
- The UI shows both "Meets Arjun's preferences" and "Meets Simran's preferences" meters on every suggestion.

---

## 4. Assumptions and limitations

- **Scores measure stated-preference alignment, not relationship success.** The weights are initial product assumptions. They should be reviewed with matchmakers and evaluated against outcome data before anyone relies on them.
- Partial scores (e.g. 0.6 for "yes" vs "maybe" on children) are hand-chosen and documented in the code next to each table.
- Free text (about, career goals, deal-breaker notes) is not interpreted. Only structured fields are scored.
- Income across currencies uses a **static FX table** (`fxToINR`), which is approximate.
- Location compatibility is city-based, with a small alias map (Bangalore → Bengaluru, etc.). There are no regions or distances.
- **Caste/community is never scored**, even when a preference is stated; it is shown to matchmakers for context only. Religion is scored only if the person voluntarily specified a preference, within the 5% category, or enforced if they chose the `different_religion` deal-breaker.
- The pool is scored in memory per request. Measured locally, ranking 144 profiles averages about 2 ms on Node 20. Much larger pools would need pre-filtering by eligibility in the database and caching of pair scores.
- Seed data is synthetic. Its preference distributions shape the score distribution described above.

---

## 5. Worked example (real engine output from the seed data)

**Customer:** Arjun Malhotra (male, 32, Bengaluru, Senior Product Manager, ₹42 L, 180 cm). He wants children, prefers ages 26–32, prefers Bengaluru/Mumbai/Pune, and has `smoker` as a deal-breaker. He has stated no relative age/income/height preference, so the male defaults apply.
**Candidate:** Simran Gill (female, 30, Chandigarh, IRS Officer, ₹18 L, 168 cm). She wants children, prefers ages 29–36 and heights 170–192 cm, and is open to relocating.

Eligibility: passes. Neither person's deal-breakers are violated, they are of opposite gender, and they have not been introduced before. Weight profile: `male_customer`.

| Category                      | Weight | Raw  | Evidence | Score | Key checks                                                                                                                                       |
| ----------------------------- | ------ | ---- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relationship goals & children | 25     | 100  | 1.00     | 100   | ✓ Both want children · ✓ same timeline (within 1 year) · ✓ marital status fits both ways                                                         |
| Age preferences               | 15     | 100  | 1.00     | 100   | ✓ Simran (30) within 26–32 · ✓ Arjun (32) within 29–36 · ✓ 2 years younger _(default rule)_                                                      |
| Career & education            | 15     | 100  | 1.00     | 100   | ✓ MA meets "Bachelor's+" both ways · ✓ earns less than Arjun _(default rule)_                                                                    |
| Location & relocation         | 15     | 73.8 | 1.00     | 73.8  | ◐ Simran outside Arjun's cities but open to relocating (0.8) · ◐ Arjun outside Simran's cities, "maybe" (0.5) · ✓ feasible: Simran will relocate |
| Lifestyle & values            | 15     | 100  | 1.00     | 100   | ✓ non-smokers · ✓ Simran has pets, Arjun is happy with pets · ✓ both "moderate" · ✓ shared values: honesty, family                               |
| Language & interests          | 10     | 86.7 | 1.00     | 86.7  | ✓ Hindi, English, Punjabi · ✓ each speaks the other's preferred languages · ◐ one shared interest (travel), 0.6                                  |
| Other stated preferences      | 5      | 100  | 1.00     | 100   | ✓ 12 cm shorter _(default rule)_ · ✓ Arjun's 180 cm within Simran's 170–192 cm                                                                   |

```
weighted = (25·100 + 15·100 + 15·100 + 15·73.8 + 15·100 + 10·86.7 + 5·100) / 100 = 94.74
forCustomer = 97, forCandidate = 94  →  cap = 94 + 15 = 109 (not applied)
final = 95  →  High Potential, high confidence (evidence 1.0)
```

**Assumptions shown to the matchmaker:** Arjun has not stated a relative age, income or height preference, so the configured assignment defaults ("younger", "earns less", "shorter") were applied.

**Missing-data example.** Ishita Banerjee is a new client with no stated views on children, diet, location or values. Her top suggestion scores **74 · Good Potential · medium confidence** (evidence 0.61). Without the evidence shrinkage her relationship-goals category would read 100. It reads 57.7, because only 15% of that category's evidence exists. The engine lists every unknown, e.g. "Ishita has not stated a view on children."

**Mutual-preference example.** Kavya → Sai: the weighted score is 78.3, but Sai's own preferences are met only 60/100, so the final score is capped at **75**, with the reason shown.

---

## 6. Ethical considerations and privacy safeguards

- **Fictional data only.** All 144 profiles are synthetic. Emails use the reserved `example.com` / `tdc.example` domains. Phone numbers use the invalid `+91 00000 …` range, so they cannot belong to anyone. Companies are invented; college names are used only as education labels.
- **Sensitive attributes.**
  - Religion and community are optional and display as "Prefers not to say" / "Not shared".
  - Community is never scored.
  - Religion is scored only on the person's own stated preference.
  - None of these fields is ever sent to the AI service.
- **Gender rules are explicit and switchable.** They are labelled as assignment defaults in the UI, never presented as relationship science, and overridden by any stated preference. Female customers are deliberately not given the mirror-image stereotype.
- **No silent exclusion.** Every exclusion has a reason the matchmaker can see. Missing data never excludes anyone, except date of birth (needed to verify legal age) and gender (needed to apply the configured gender rule), and both of those are shown as "needs review".
- **Human in the loop.**
  - The engine only _suggests_.
  - Sending requires a matchmaker to review both profiles, edit or approve the message, and tick an explicit confirmation. The server enforces this too.
  - Emails are simulated unless a real provider is added.
- **Least-privilege data access.**
  - Matchmakers see only their own clients; leads see all.
  - Other matchmakers' clients return 404.
  - Candidate views strip contact details.
  - Password hashes and JWTs never reach the browser's JavaScript, because the session is an httpOnly cookie.
- **No probability claims.** The UI, API and docs consistently say the score is a guide, not a prediction of relationship success.
