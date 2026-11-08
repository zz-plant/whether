<!-- Part of the feature log. Index: ./README.md -->

## 8) Demo and interactive features (2026-05-23)

### 8.1 What-if simulator tools (removed Aug 2026)
`app/components/home/DecisionSimulator.tsx` and `app/components/ScenarioSimulator.tsx` rendered
below the hero on `/`. Both were removed as below-the-fold tool racks that competed with the
weekly decision-attention block. The scenario what-if still lives in the decision-attention flow
only where it changes a revisit verdict; it is no longer a standalone home surface.

### 8.2 Regime transition probability (removed Aug 2026)
`app/components/home/RegimeTransitionProbability.tsx` computed an empirical one-month exit rate
for the current regime from monthly time-machine observations. The card and the hero's
`transitionForecast` line were removed from home. `computeTransitionProbability`
(`lib/timeMachine/transitionProbability.ts`) stayed as an internal diagnostic until 2026-09-16,
when it was deleted because only its own test imported it.

### 8.3 Regime history over time (removed Aug 2026)
`app/components/RegimeHistory.tsx` rendered the trailing 24 months of `getMonthlyRegimeHistory()`
as a bar chart in the lower home band. Removed from home; the engine
(`getMonthlyRegimeHistory`, `lib/summary/monthlyRegimeHistory.ts`) stays for evidence/replay
surfaces.

### 8.4 Decision records (canonical: decision memory)
**Location**: `lib/decisionMemory.ts`, `lib/decisionFollowUp.ts`,
`/api/decision-memory`, `app/decisions/page.tsx`,
`app/operate/components/recordDecisionButton.tsx`, `app/components/home/YourRecordNote.tsx`.

The one system of record for "what did we decide and when": server-backed entries keyed by
client id, recorded from the Decision Shield on `/operate`, and listed with their staleness
verdicts on `/decisions` (§5.7). The brief says how many of a browser's decisions rest on conditions
that moved (`YourRecordNote`, §1.1.28). `/operate/memory` redirects to `/history`
(`next.config.js`). Since 2026-10-23 each row on `/decisions` can carry a review response —
continued, changed, or deferred — recorded against the reading being reviewed (§5.7); the
review trail is stored beside the ledger and never appears as a decision row in the exports.

Removed Aug 2026: `VisitorContext` (this section's previous subject) was deleted earlier without
a spec update, and with it the only writer of the `whether_decision_history` localStorage key.
The `DecisionArchive` table on `/history` kept reading that key, so it rendered nothing for every
visitor — it and `useDecisionHistory` are now deleted too. Do not add a second decision-record
store; extend decision memory instead.

### 8.5 Reliability score (removed Aug 2026)
A 0–100 score combining confidence (HIGH=90/MED=60/LOW=30), freshness (live=100/cached=50) and
source coverage, colour-coded emerald ≥80, amber ≥60, rose <60. It was drawn in `BriefHero.tsx`
(deleted 2026-06-10) and later in `DeltaTrustStrip`, and left the product on 2026-08-01. The trust
strip's sources, confidence and record date carry what it summarized.

### 8.6 Degraded-state decision guidance
**Location**: `app/page.tsx`, `resolveDataStatusGuidance` and `describeSavedCopyBanner` in
`lib/report/trustStatus.ts`.

When the report read fails, a caveat line above the brief states that data state's guidance. On a
saved copy it names the reading and its age: "Live data is late, so this is the Jun 17, 2026
reading, 4 months old." Where the guidance is held (the bundled copy always is, for missing inputs)
the hero's call is the one instruction and the line stops there; otherwise it adds "Keep your
current plan; hold new hires, spend and vendor contracts until live data returns." `/operate`'s
`LiveDataFallbackAlert` opens on the same sentence with the hold. The reliability-score warning this
section first described ("Stage all irreversible decisions until the next clean refresh.") left
`BriefHero.tsx` on 2026-05-23.

On a saved copy the rest of the page speaks for the old reading, not for this week (2026-11-02).
Until then the Jun 17 copy, read on Oct 21, printed "No area is on hold." under the banner's hold,
"Could change next week" in the trust strip, and "No previous week to compare" over the signal
table. Now:
- the card prints no held-areas line and no exception band;
- the count over the areas is dated and past tense ("No area was on hold on the Jun 17, 2026
  reading.");
- the trust strip's margin keeps its distance and drops the next-week forecast and the base rate,
  on every route that draws it (`buildTrustStripProps` sets `savedCopy`);
- "What changed" says "Nothing new to compare: this is the saved Jun 17, 2026 reading."

On any reading, an area that is not on hold prints "nothing to resume" in its restart cell in the
picker, rather than a distance to a line that has no hold to lift (`buildHomeAreaRows`); the area
table prints no restart cell for it at all since 2026-11-03 (§1.1.101), except on `/operate`.
`tests/savedCopyHomepage.test.tsx` renders the route with the operating-state store down and holds
each of these.

### 8.7 Print layout
**Location**: the `@media print` blocks in `app/styles/layout-effects.css` (imported by
`app/styles/layout.css`) and `app/styles/surfaces.css`.

Hides navigation, sidebar, and non-essential chrome. Converts dark theme to light (white bg, dark text). A4 page size with `break-inside: avoid` on cards.

### Demo recording guide
To record GIFs of interactive features:

```bash
bun run dev                                    # Start dev server
```

**Print layout GIF**: Open `/`, Cmd+P, show print preview with clean white layout. ~5 seconds.

For screen recording, use macOS QuickTime (File → New Screen Recording) or Kap (https://getkap.co). Convert to GIF with `ffmpeg` or gifski.
