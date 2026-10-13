# Editorial guardrails for board-facing SEO content

Use this guide for long-form governance resources, pillar pages, and board-facing template copy.

## Tone and voice
- Write for directors, founders, and executive staff who need operating clarity under uncertainty.
- Prioritize concrete governance mechanics (cadence, thresholds, artifacts, and owners).
- Favor precise, non-sensational language over market prediction rhetoric.
- Keep claims operational: describe what teams can control, monitor, and escalate.

## Disallowed and preferred framing
- **Avoid: predict downturns**
- Avoid deterministic macro forecasts, certainty language, and “guaranteed outcomes.”
- Avoid fear-based copy that implies governance can remove uncertainty.

- **Preferred: governance, discipline, reversibility, thresholds, artifacts**
- Prefer framing that emphasizes controllable process quality.
- Prefer artifact-centric language (decision packets, board packs, threshold logs, rollback plans).

## Primary product-surface positioning guardrails

For first-touch product surfaces (homepage hero copy, metadata descriptions, exported brief headers),
lead with founder decisions before methodology.

- Preferred framing:
  - "weekly answer for hiring, fundraising, and runway"
  - "startup market weather"
  - "weekly operating guidance for startup leaders" (the category line; see below)
- Disallowed framing on primary surfaces:
  - "macro dashboard"
  - "startup data platform"
  - "economic forecasting tool"
  - "market analysis"

Primary-surface copy should follow: weather/context → weekly posture → concrete decision action.

## Claims policy
- Do not claim that any framework “prevents failure.”
- Do not imply legal, compliance, or fiduciary advice.
- Use “supports,” “improves consistency,” or “increases decision quality” instead of absolute outcome claims.

## CTA policy
- Every long-form pillar should include a midpoint CTA and end CTA.
- CTA language should map to clear operator outcomes:
  - Template download
  - Board pack request
  - Decision workflow walkthrough/demo contact

## SEO hygiene
- Include the primary keyword in slug, H1, title tag, and meta description.
- Use clear H2/H3 hierarchy that maps to board-level operating questions.
- Add internal links to canonical parent topic and key supporting artifacts.

## Decision vocabulary (single source)
- **Regime names render as weather everywhere visible**: Freezing / Cloudy / Stormy / Sunny.
  Source is `lib/regimePresentation.ts` (`REGIME_LABELS`, the one label table). Concept keys (SCARCITY/DEFENSIVE/VOLATILE/EXPANSION) stay
  internal — they are engine terms, not display copy. Compass quadrant axes are the one
  defined exception (axis labels).
- **There is no separate posture-description layer.** `getRegimeDisplayLabel` used to return
  Contraction / Transitional Mixed / Guarded Expansion / Expansion; it returns the weather name
  now (`lib/regimePresentation.ts`).
- **Forecast outcomes render as weather names too** (2026-09-22). `ForecastRegimeLabel`
  (Expansion / Mixed / Scarcity / Defensive, `lib/report/forecastModel.ts`) stays a typed
  internal layer; `forecastWeatherLabel` is what reaches a reader. Four names for four states
  was the second vocabulary a reader had to look up.
- **The stance object is the guidance** (2026-09-23): "this week's guidance", with "weekly
  operating guidance" on first mention in cold surfaces (shares, metadata, answer pages).
  "Guidance" is uncountable: never "a guidance"; rewrite. "The call" is retired, because it
  did three jobs — the recommendation, the market state and the line between states — so "the
  call changes to Stormy" and "call changes at 70" both read as the recommendation changing.
  The state is **conditions** ("conditions turn Stormy", "Conditions by month"); the line is
  **the change line** in labels and "the line where conditions change" in prose. The
  retired senses are ratcheted at zero by `tests/readerVocabulary.test.tsx`, as is "Posture";
  do not mint recommendation/verdict/call as user-facing stance synonyms ("verdict" is
  internal). Identifiers, API fields and `#anchors` keep `call`: they are contracts, not copy.
- **The forward-look noun is forecast** ("why the forecast shifted", the forecast cone).
  Do not add synonyms (outlook/conditions) for the forward estimate. The command bar's
  "{regime} outlook" chip is a pass-through descriptor of current conditions, not a
  forecast synonym.
- **Bounded-decision slot labels come from `DECISION_CONTRACT_LABELS`**
  (`lib/report/reportCopy.ts`): general imperative forms on screens are Do now / Pause if /
  Resume when, and the line where conditions themselves change is Conditions change if. "Change
  course if" and "Re-open when" are retired (2026-09-22): the first read as the guidance changing,
  which it named only on some surfaces, and the second was a third name for the resume line.
  Other conditions that would change the guidance print under "Watch this week". Noun slots in exports are Action / Pause line / Resume line ("Threshold" and "Reversal" were retired on 2026-10-09, with "boundary" and "trigger" for the same lines). Consume these
  exports instead of hardcoding slot words in components. Per-area bounded rules now render on
  `/operate` ("Rules by area"). The homepage scan ledger was deleted with `ThreeWhethersCard`
  (2026-09-01), and `ACTION_STRIP_DISPLAY_COPY` went with it. Its vocabulary is retired: do not
  reintroduce Stop or tighten if / Open up again when, or the Keep this closed / Proceed with
  guardrails / Stage the next move / Move ahead now lane states.
- **Decision-attention verdicts are `RECONSIDER` / `WATCH` / `No change`** (single source:
  `lib/report/decisionStaleness.ts`). These label recorded decisions whose supporting
  assumptions have moved: RECONSIDER when two assumptions moved outside the recorded range,
  WATCH when one did, No change when all hold. Alert headlines reuse the same vocabulary
  (`buildDecisionVerdictHeadline` in `lib/alert/decisionDeltaRules.ts`: RECONSIDER / WATCH
  + decision area). Do not mint synonyms like "attention needed" or "review now" for these
  verdict labels.
- **The category line has one source: `canonicalPositioningLine` / `websiteName` in
  `lib/seo.ts`.** Whether is *weekly operating guidance for startup leaders*. Outward
  surfaces — homepage title and metadata, README, launch copy, sales decks, answer pages —
  consume that constant or restate it verbatim; they do not describe the product in their
  own words. Three coinages are **internal only** and must not appear on an outward
  surface: "pacing authority" and "meeting shorthand" (`AGENTS.md` product stance) and
  "decision-translation layer" (`docs/sales-competitive-messaging.md`). "Operating posture"
  stays the label for the stance itself, not a description of what the product is. The cost
  of drift here is not tidiness: this product spreads by an operator repeating it in a Slack
  channel, and a category that changes per surface does not survive that retelling.
- **The metric noun is "Operating latitude"** — the one proper noun in this vocabulary a
  competitor cannot use, so it is spelled out on first mention rather than shortened to
  "the score". `buildBoldnessScore` in `lib/report/weeklyLeadershipBrief.ts` is the source.
- **The product noun is "Whether Weekly Brief"** (short "Weekly Brief", casual "the
  brief"). "Report" stays internal (function names, keys, docs). User-visible,
  shareable, and metadata surfaces must not print "Whether Report".
- **Signal names are Funding pressure, Risk appetite and Recession warning gauge**
  (2026-10-09), in full on charts and in inline metrics alike; "Capital tightness",
  "Pressure" and "Appetite" alone are retired. The three watch pages keep their slugs
  (`capital-tightness-watch`, `risk-appetite-watch`, `yield-curve-flip-watch`) and are titled
  "Funding pressure watch", "Risk appetite watch" and "Recession warning gauge watch".
- **The five areas are Hiring, Roadmap, Fundraising, Spending and New bets**
  (`decisionAreaLabel`). Slugs (`product-tempo`, `capital-raising`, `burn-discipline`,
  `expansion-bets`) are contracts and stay; no surface prints them or a verb-phrase stand-in
  ("Raise money", "Approve new spend"). `tests/readerVocabulary.test.tsx` bans the retired names.
- **The call has three bounded-state markers**: certainty (input confidence), flip, and
  transition. "Flip" is the call/decision reversal (bounded decision slot "Reversal");
  "transition" is the forecast-outcome change (stuck forecast indicators). If they
  diverge, flip describes the call reversal, transition describes forecast changes.
- **The distance from a change line is the "Margin"** on screens, gauges, pastes and email
  (2026-10-09): "Clear of the line", "Within reach of the line", "Close to the line", with the
  nearer score's points where the surface holds them. "Confidence" (and "Call certainty"
  before it) are retired as reader labels: the number is a distance, not a probability
  (`/calibration`), and "Confidence: Low" beside "Freeze new commitments" read as the product
  doubting its own advice. API and JSON fields keep `confidence`; the mapping is in
  `docs/developer/api-reference.md`.

## Headings (h1–h4, eyebrows, section labels)

Headings are the scan path: an operator reads the heading, decides whether the block matters
this week, and moves on. Six rules, each written after a real drift found by the 2026-09-02
inventory of every heading in `app/`:

- **A heading names what the reader gets, in the reader's words.** No codenames, framework
  terms, or engine vocabulary. Retired from user-visible text: "Decision contract" (now "This
  week's bounded call"), "Continue decision flow" ("Where to go next"), "Epoch" ("period"),
  "Transmission Synthesizer", "Operator Loop", "Canon references", "Included instruments",
  "Other handoffs", "Red-Team" and "Stress-Tester" (both "Plan stress test"), "Post-MVP", and a
  visible "Primary keyword:" eyebrow. Invariant 9 in `tests/architectureInvariants.test.ts`
  fails on any of them in a non-comment line under `app/` or `lib/`.
- **Eyebrow classifies, heading states, description elaborates.** The eyebrow is the shortest
  of the three. Never put the sentence in the eyebrow and the label in the heading — "Escalate
  only if one question remains" over "Decision help" was the inverted case.
- **A nested section does not restate its host.** Inside a stepper step or a panel that already
  names it, pass `hideHeader` (`docs/agents/ui-ux-standards.md` → XI) or give it a strictly
  more specific title. Four "share" headings on one `/operate` step was the failure case.
- **A page does not narrate what its structure already says.** The "On this page" index names the
  sections, a table caption names the table, a heading names the section; a summary or intro line
  that lists the same things is the outline read aloud. The intro summary states the page's job
  instead — `/signals` says "The evidence behind this week's guidance", not "What moved, why it
  matters, and what would change the guidance", which was the index as a sentence (found
  2026-10-04). Same rule for a caption narrating controls the rows already show: the `/share` tag
  table's caption pointed at its own copy buttons.
- **Sentence case everywhere.** Capitals only for proper nouns: Whether, Operating latitude, the
  weather regime names, FRED. No all-caps in source — `.type-eyebrow` uppercases in CSS — and no
  emoji in a heading or label.
- **One name per thing, across surfaces.** The paste-a-plan tester is "Plan stress test" on `/`
  and `/operate`; the single-decision block is "This week's bounded call"; a per-area list is
  "Bounded calls". Slot labels come from `DECISION_CONTRACT_LABELS`, and a Title Case variant
  ("Action Now", "Pause Guardrail") is still a synonym — Invariant 8 matches case-insensitively.
- **Counts and states live in a badge, not the heading.** "3 DECISIONS NEED ATTENTION" became
  "Decisions to reconsider" with a count badge beside it, and a zero state never asserts a
  problem.

## Sentence shape (2026-10-09)

From a line-editing pass over every rendered string, run the way it was run on the owner's other
sites. `tests/readerClauseShapes.test.tsx` holds the first two rules; the rest are for review.

- **A list is one kind of phrase.** All noun phrases or all wh-clauses, or a full sentence. "Look
  up what the guidance said in any past month, and how it held up." and "This week's guidance, why
  it changed, and how much to trust it." stapled a wh-clause onto something else. A real question
  ending in "?" is fine.
- **A gloss is printed once.** Define a term the first time a page uses it and drop the repeats;
  "79 (money is hard to raise) then and is 90 (money is hard to raise) now" said it twice. A
  reading goes after the rule as its own sentence ("… is above 76 or …. Funding pressure is 90
  now."), not in parentheses inside it.
- **A clause sits next to its noun.** "Venture-backed U.S. companies with one to two years of
  runway, whose next raise depends on what capital costs" read the raise onto the runway; it is
  "… and a next raise that depends on what capital costs". Where moving it reads worse, split it
  into its own sentence.
- **One idea per sentence.** A ", which…" or ", where…" aside on the end, a ", meaning…" tail, a
  dash aside in the middle, or 30+ words carrying two ideas: split it.
- **Not staccato.** Splitting stops at one idea per sentence; a page of five-word sentences is as
  hard to read as a page of clauses.
