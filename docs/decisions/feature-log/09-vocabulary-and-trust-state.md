<!-- Part of the feature log. Index: ./README.md -->

## 9) Vocabulary and trust-state consolidation (2026-09-02)

Ten product-sense fixes landed together; the semantic ones are recorded here so downstream
surfaces do not reintroduce the old words.

- **One regime vocabulary.** `getRegimeOperatorLabel` and `getRegimeDisplayLabel` both return the
  weather name (Freezing / Cloudy / Stormy / Sunny). "Expand", "Guarded Expand", "Conserve",
  "Defend", "Contraction", "Transitional Mixed", and "Guarded Expansion" are no longer rendered.
  Archived labels in `data/*.json` are translated at render time with `toWeatherLabel`
  (`lib/regimeLabels.ts`). The `modifier` field (Guarded / Transitional) survives as data.
- **One data-status vocabulary.** `DATA_STATUS_LABELS` in `lib/report/trustStatus.ts` — Live,
  Partly cached, Cached snapshot, Historical snapshot — is what the freshness pill, the hero
  provenance line, the report-shell masthead, and the Trust page status card all render. The
  masthead headline is derived from state via `resolveTrustReadinessCopy`; it no longer sniffs
  the detail string for words like "low".
- **Regime-aware weekly headline.** `buildActionNowShort` takes the regime, so a softening Sunny
  week reads "keep what is working. Don't start anything new this week" rather than "freeze new
  commitments", which contradicted every downstream page.
- **Guardrail slot is a threshold.** `reportDataLoader` fills `guardrailThreshold` from the first
  action-strip trigger instead of the playbook's first "stop" item.
- **Condition phrasing.** `formatDecisionThreshold` / `formatDecisionReversal` strip the verb and
  its object ("Pause net-new hiring if …" → "Funding pressure rises above 76 …") so slot labels
  that already carry the verb read as sentences. `formatThresholdNumber` drops the `.0` on integer
  thresholds everywhere a threshold is printed.
- **Historical analog.** The Evidence page shows the four match coordinates (then vs now) and
  names the block "Nearest reference cycle". The API field is `matchScore` (0-100, `100 / (1 + d)`
  over the spread-normalised coordinate distance). It replaced `correlationScore`, which was
  neither a correlation nor unbounded below: it was floored at 65, so the worst possible match
  reported 65% similarity to every API and MCP consumer.
- **Header.** The desktop nav renders the operator loop from `resolveGlobalHeaderLoopLinks`
  (supporting layers hidden below `lg`); the top-level API link moved under More. The live
  masthead no longer prints a "15m cadence" refresh label.

### 9.1 Reversal and resume conditions (2026-09-02, follow-up)

- **`buildFlipThreshold` returns one bounded condition.** It used to return three sentences: a
  status ("No flip condition is tripped yet.") plus two that each repeated "flips this call",
  under slot labels that already carry that verb. Because the compaction helpers cut a phrase at
  its first period, the Slack export of a frozen brief read "Re-open when: No flip condition is
  tripped yet." and carried no threshold at all. It read
  `Funding pressure above 70 (63 today) or risk appetite at or below 50 (56 today).`, and a
  boundary already crossed said "(already true at N)" and sorted first. Since 2026-10-09 it reads
  `Funding pressure rises 7 pts from 63 to clear 70, or risk appetite falls 6 pts from 56 to 50 or below.`;
  a crossed boundary still sorts first, states where the score is, and is followed by its
  reading ("Funding pressure is 75 now.") — §1.1.1c.
- **The Evidence page's "Safe again when" shows the resume trigger.** It rendered `flipThreshold`,
  the condition that *breaks* the call, which `/trust` correctly labels "This recommendation
  breaks if" — so the same string appeared under opposite meanings on two pages. It now reads
  `actionStripItems[0].reversalCondition`, symmetric with the pause trigger in "Wrong if" above it.
  (2026-09-29: both rows now print the canonical slot labels, "Pause if" and "Restart when";
  "Wrong if" / "Safe again when" were a third name for the pair.)
- **The hero's resume row is labeled `clearsWhen`, not `flipWatch`.** That row holds the resume
  thresholds (66 / 54), and sat directly under the reversal row (70 / 50) as a near-synonym
  carrying different numbers, leaving three unexplained pairs stacked in one box.
- **`sectorSensitivity` reversal copy** uses `formatThresholdNumber`, so the sector tilt no longer
  prints "above 70.0".

Archived briefs in `data/published_briefs.json` keep the wording they were published with; the
archive is append-only and its exports are expected to read as they did on the day.

### 1.1.73 Controls read as instrument parts (2026-10-13)

Every segmented control — plan horizon, stage, cash runway, the decision picker, and the ones on
/signals, /operate, /share and the subscribe form — is a recessed well with keys in it
(`docs/agents/ui-ux-standards.md` §XXVI). The chosen key stands proud and lights its lamp, and a
pressed key sinks. Stage and cash runway are ordered scales: a rule with a tick under each key and
a pointer under the chosen one, with Bootstrapped set apart from the funded stages. The company
controls are four equal keys on one row from `sm` up, each label over its sublabel, where they
used to break 2 + 2 and wrap each sublabel mid-phrase. No gradient or specular: §XXV stands.

### 1.1.74 The week stepper and the pickers use the same parts (2026-10-13)

The week stepper on `/` is one well: the earlier and later week are keys at either end of the
calendar picker, and the end with no week beyond it sinks flat instead of drawing a faded box. The
header's stage and runway pickers mark the chosen option with a lit lamp instead of a check over an
action-ink wash, and the calendar's months and known periods are keys that stand proud when chosen.
The three pickers that drew at 95% opacity with nothing blurred behind them are opaque: the page's
text read through them (`docs/agents/ui-ux-standards.md` §XXVI).


### Homepage space allocation (2026-10-29)

The live week picker sits inside the call card header, below a single-sentence first-visit
category line. The hero display and inter-section spacing are compressed. Changed composite
scores lead the evidence table; unchanged composites retain their visible bounded lines,
and raw inputs retain their current values in compact rows. Supporting histories are in a
URL-carried disclosure (`inputs=1`), and the hero chart's scoring qualification is in its
readings disclosure (`chart=1`). See `one-screen-weekly-brief-spec.md`, “Space allocation pass”.

### Shorter paths to the weekly task (2026-11-07)

The brief describes the current scores separately from the committed conditions.
An area that newly pauses names its crossed line and the comparison date together.
When conditions are awaiting confirmation, the trust line names the candidate and
the crossed conditions line. Sample conversations about pause rules live on Roles,
linked from the brief beside the decisions when an area is on hold.

Plan and Evidence show the reading date and source exceptions in their intros.
Trust opens on the source board and owns the calibration count and formula reference.
Share leads with the format picker, copy action and preview. Its supplemental score
references sit in a disclosure below the preview. Guides opens on the decision list
with weekly area badges. History labels its latest archived month, and dated briefs
offer a single link to current guidance alongside the dated record. Advice vs. market
opens with its sample result, with the comparison figures in the table and the tagging
rubric in the method.

### Compare periods, calendar actions, role navigation, and warning track record (2026-11-08)

Compare periods loads both periods through a single loader (`loadCompareData`), eliminating
duplicate Period A loads between the page and panel, and renders a visible error state alongside
selectors if a period fails to load. The comparison diff leads with the rules that changed
between the two named dates (area pause lines and weekly call thresholds), putting the full score
ladders and side-by-side readings below.

Calendar actions are unified under one home with three clear labels: "Add one review" (single
event for next Monday), "Schedule a weekly review" (recurring Monday hold), and "Subscribe to the
weekly brief" (calendar feed). Recurring review times are formatted in the reader's local time
zone rather than assuming a fixed UTC/Eastern time.

Roles serves as the front door for role guidance. Each role has a single landing page linking to
the corresponding leadership guidance and applicable worksheets. Guides retains situation-based
tools and stage guidance, linking to Roles for role guidance.

History leads its track record with how much advance warning the brief gave (the count of signaled
changes and missed unannounced changes), while Calibration retains stability by distance, the
complete month-to-month stability study, denominator, and method.
