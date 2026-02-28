# One-screen weekly leadership brief spec (v2, decision-complete)

## Product job to be done
Whether must reduce uncertainty faster than leadership debate does, in under 30 seconds.

This screen exists to make the weekly planning call legible, bounded, and shareable.

## Success definition (behavioral gravity)
This view succeeds only if it becomes:
- a **weekly ritual**,
- a **pacing authority**,
- a **meeting shorthand**,
- a **Slack screenshot product**.

If leaders start saying “we’re +1 bold this week,” the surface is working.

## Primary user and moment
- **Primary user:** VP Product / VP Engineering / GM.
- **Moment:** Monday leadership sync prep + first 10 minutes of the meeting.
- **Decision:** keep posture vs. revise hiring, roadmap, and spend tempo.

## Hard constraints (non-negotiable)
1. **10-second readability:** first viewport answers posture and action delta without scroll.
2. **30-second decisiveness:** user can state what changed and what to revisit.
3. **Single anchor metric:** Boldness Budget is the canonical scalar.
4. **Bounded downside:** explicit conditional triggers define what changes if wrong.
5. **Slack portability:** screenshot is decision-complete and clean at preview scale.

---

## Exact one-screen layout contract
Top-to-bottom order is fixed. The first four blocks must fit above the fold on desktop (1280×800).

### Block A — THIS WEEK (hero, decision header)
**Purpose:** instant posture call.

**Required copy format (exact labels):**
- `THIS WEEK`
- `Boldness budget: +1 notch`
- `Hiring window: Open`
- `Expansion window: Strong`
- `Raise window: Improving`
- `Stability: Moderate (Week 3)`
- `Net delta: Slightly more aggressive than last week.`

**Rules:**
- No explanatory paragraphs in this block.
- No links in primary scan path.
- Content must remain readable at 90% browser zoom.

### Block B — Spoken shorthand strip
**Purpose:** convert insight into reusable meeting language.

**Required line:**
- `We’re +1 bold this week.`

**Optional line (max one):**
- `Baseline posture: [posture label].`

### Block C — Boldness Budget module (single scalar)
**Purpose:** establish one numeric anchor for cross-functional alignment.

**Required structure:**
- `Boldness Budget: 63 / 100`
- `Change: +4`
- driver chips (max 3):
  - `Risk appetite +4`
  - `Tightness unchanged`
  - `Curve stable`

**Rules:**
- Score range is fixed at 0–100.
- Delta must always be shown with sign (+/-).
- Driver chip count is capped at 3 to protect scan speed.

### Block D — Revisit decisions flag (binary ritual trigger)
**Purpose:** force explicit weekly act/hold decision.

**Required prompt:**
- `Revisit last week’s roadmap/hiring decisions?`

**States:**
- `YES — Regime shift detected.`
- `NO — Hold posture.`

**Rules:**
- Exactly two states: YES / NO.
- If YES, include one-line cause.
- If NO, no extra commentary.

### Block E — What changes if wrong? (conditional guardrails)
**Purpose:** bound downside and prevent overconfidence.

**Required row pattern:**
`If [trigger] → [policy consequence 1] → [policy consequence 2]`

**Minimum two rows:**
- `If tightness rises 20 points → Hiring window closes → Boldness budget drops 12 points`
- `If curve inverts → Payback tolerance tightens to ≤ 9 months`

**Rules:**
- Each row must include at least one numeric threshold.
- Avoid probabilistic prose (“might,” “could”).

### Block F — Window velocity
**Purpose:** introduce urgency via direction, not just level.

**Required format:**
- `Expansion window: Strong`
- `Trend: Cooling`

**Optional additional windows:** hiring, raise.

**Rules:**
- Trend vocabulary limited to: `Strengthening | Flat | Cooling`.

### Block G — Memory rail (last 4 weeks)
**Purpose:** create narrative continuity and ritual check-in value.

**Required content:**
- `Last 4 weeks: Boldness 58 → 61 → 59 → 63`
- `Hiring window trend: Strengthening`

**Rules:**
- Exactly four points for compactness.
- No full chart required on this screen.

### Block H — Confidence strip (trust without essays)
**Purpose:** reduce re-litigation by proving data readiness.

**Required labels:**
- `Data freshness: 0h`
- `Confidence: High`
- `Inputs complete: Yes`

**Rules:**
- Keep to one row.
- Do not append methodological footnotes here.

---

## Slack screenshot card contract
This card is the dissemination mechanism and must stand alone when pasted into Slack.

### Required fields (exact)
- `Macro: Risk-On / Capital-Loose`
- `Boldness: 63 (+4)`
- `Hiring: Open`
- `Expansion: Strong`
- `Stability: Week 3 / Avg 8`
- `Net: Slightly more aggressive.`

### Visual and copy constraints
- One card, one viewport, no scroll.
- No footnotes.
- No methodology callouts.
- No secondary nav chrome.
- Line lengths must avoid wrapping at typical Slack preview widths.

### Pass/fail check
A VP should be able to paste the screenshot and write only:
`Use this as planning baseline.`

If additional explanation is needed, the card fails spec.

---

## Language and compression rules
- Lead with **decision deltas**, not macro definitions.
- Use **operational nouns** (hiring, expansion, payback, stability).
- Minimize adjectives; maximize bounded numbers.
- Default to sentence fragments over paragraphs.

## Data contract (minimum viable)
Per weekly snapshot, the system must provide:
- Boldness score (0–100) and WoW delta.
- Window states: hiring, expansion, raise.
- Stability index: current week + rolling average.
- Counterfactual thresholds with mapped policy impact.
- Last-4-week boldness series + hiring trend direction.
- Freshness, confidence, and completeness metadata.

## Instrumentation and evaluation
Track adoption signals tied to ritualization:
- time to first decision statement,
- percentage of sessions with Slack export/share,
- Monday return rate,
- frequency of “Revisit decisions?” = YES,
- meeting transcript mentions of boldness scalar.

## Acceptance criteria
1. In ≤10 seconds, user can answer:
   - “How bold are we this week?”
   - “Should we revisit last week’s decisions?”
2. In ≤30 seconds, user can state:
   - current net posture delta,
   - one boundary condition that changes plan,
   - whether key windows are opening or cooling.
3. Screenshot card is share-ready with zero editing.
4. Teams naturally reference a scalar (“we’re at 63”) in planning discussions.

## Non-goals
- Teaching macro frameworks on this surface.
- Replicating deep evidence/method pages in-line.
- Adding new upstream datasets before improving compression and legibility.
