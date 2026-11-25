# One-page brief implementation plan

**Goal:** Implement approved mockup 3 so the weekly call and five actions lead, with evidence in a quiet margin and no competing history banner.

**Architecture:** Recompose the existing DecisionHero and AreaStrip rather than introducing a second homepage. Keep the canonical rule models, exports, URL selection, archival caveats and calibrations. Use a native disclosure for the shared record and for optional decision exploration.

**Tech stack:** React, vinext, existing CSS tokens and Bun checks.

**Spec:** `.impeccable/mocks/declutter-20261121/brief.png`, approved by the owner's “lgtm” following the recommendation of option 3. The maintenance override applies to this redesign.

## Constraints and interpretation

- Keep real pause/restart lines visible; the mockup's View lines links do not replace conditions needed to act.
- Keep the Forecast palette, both themes, self-hosted fonts, canonical vocabulary and deterministic rules.
- Do not change data refresh, scoring, export contents, routes or publication behavior.
- Preserve the shared category line, all history interactions, and direct links into decision detail.
- The implementation is authorized; execute locally through verification without another planning approval.

## Review focus

- Narrow 320px screens: actions and conditions wrap without clipping or tiny text.
- Archived/fallback readings: the dates and caveats remain attached to the artifact.
- A decision URL or hash: optional exploration opens and remains keyboard reachable.
- Screenshot and print: the artifact carries its date, condition and source.
- Both themes: sky inks stay readable; no new literal colors in stylesheets.

## Tasks

- [x] Recompose DecisionHero, contain the sky, move the changed-line notice into the call, and expose every action and its canonical line in AreaStrip. Fold optional DecisionPicker exploration and keep URL selection open.
- [x] Compress RecordBand into a native shared disclosure with the category line visible, preserving its original chart, readout and history destination.
- [x] Update affected rendering contracts and canonical docs. Run focused tests, verify, the pre-merge check, desktop/mobile captures in both themes, frame and console checks. Obtain the Impeccable finish review, apply material fixes, document the final system and report exact delivery status.

## Verification ledger

- Baseline: 48 targeted tests passed across home route, heading, intuitive reading and record-band tests.
- Final: `bun run verify` and `bun run check` pass; 4,028 tests across 498 files, 0 fail.
- Home-load budget fell to 1,399 words, 288 before the areas, 226 numbers, 14 buttons, 24 "Funding pressure" mentions, 29 "Risk appetite" mentions, 0 hard sentences (`scripts/check-home-load.ts`).
- Captures: dark and light, desktop (1600) and phone (430), plus 320; no horizontal scroll and no text under 12px at 320. Frame audit: desktop 6/6 frames stand alone, phone 8/8, both themes, strict.
- Browser: console clean; `?decision=product-tempo` opens the exploration on Roadmap; an area row's `#area-hiring` opens the disclosure; the record disclosure opens and its month readout hydrates.
- Finish review: disposition `fix` at the first pass; material fixes applied (hero facts sentence removed, wide brief measure scoped to the call and rail with the reading body at 72rem, rail links reordered, row text at 15px, phone score panel compacted to two short captions plus one shared restart sentence, compact caption at 14px). Remaining, deliberate: the Forecast sky gradient and clouds (the direction contract's committed world; the comp is flat), the rail's two figures keep the lead rule's lines and name Hiring (the 2026-11-18 product fix), and the formal comp-diff scaffold (`spec.json`, `hero-repro.png`, `diff/**`) was not used because the comp was approved in the decision round and the build is a code-led extension.
