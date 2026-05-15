# Production key journey QA — 2026-05-15

## Scope

Production target: `https://whether.work`

Primary operator journeys tested:

1. Read the weekly brief and personalize the company stage.
2. Download or copy share-ready artifacts from the homepage.
3. Move from the weekly brief into Planning.
4. Use Evidence short/deep views.
5. Use Planning stepper and share/export checkpoint.
6. Use Decision Tools / Resolve and the tool-finding path.
7. Check Trust, legal pages, redirects, and retired routes.

Quality lens: decision transmission, artifact readiness, trust compactness, and route clarity.

## Overall result

No production crash was found after the toast-provider fix. The key public routes returned expected HTTP status codes and browser console/page errors were clean for the main live journeys.

The main remaining issues are journey quality problems, not hard outages: PDF artifact download is broken, Planning share controls are not reachable from the share step, the homepage lacks a real `h1`, the tool-finding entry point redirects into Resolve with mismatched expectations, and Evidence exposes duplicate radio controls.

Resolution status after local fixes:
- Homepage PDF download now emits `whether-briefing-pack-May 15, 2026.pdf` in Playwright with no console errors.
- `/planning#ops-export-briefs` opens the Share step with `Default briefs` and one visible `Download weekly digest` control.
- `/` renders exactly one `h1`: `Weekly Brief`.
- The homepage `Find a tool` action points directly at `/resolve#toolkit-library`; empty `/search` also redirects there.
- `/evidence` exposes two custom radio controls and zero native `input[type="radio"]` controls.
- `/trust#source-board` exists and matches the homepage source-board handoff.

## Issues

### P0 — Homepage PDF artifact button does not produce a download

Route: `/`

Journey: weekly brief → Send this brief → `Download PDF`

Observed:
- `Download briefing pack (.txt)` produced `whether-briefing-pack-May 15, 2026.txt`.
- `Download PDF` was visible and clickable.
- Playwright waited 45 seconds for a `download` event after click and no download occurred.
- No console error or visible failure message was emitted.

Why it matters:
- Artifact quality is a hard product rule. The homepage promises a meeting-ready PDF, but the action silently fails.
- Silent failure is worse than a disabled control because the operator gets no fallback instruction.

Likely code anchor:
- `app/components/downloadBriefingPackButton.tsx`

Next action:
- Reproduce locally with a focused Playwright test around `DownloadBriefingPackButton`.
- Add visible error handling around stalled PDF generation.
- Prefer appending the anchor to `document.body` before `click()` and removing it after, then assert a browser download event in the test.

### P1 — Planning share/export checkpoint is not reachable from the share step

Route: `/planning#ops-export-briefs`

Journey: Planning → Share → export weekly digest / default briefs

Observed:
- `/planning#ops-export-briefs` loads the Planning page and updates the stepper context.
- The page includes `Share the brief`, but the share controls from `ExportBriefPanel` are not visible.
- `Download weekly digest` count was `0`.
- The body did not include `Default briefs` or `Quick share formats`, even after waiting 15 seconds.

Why it matters:
- Planning is supposed to be the downstream artifact checkpoint.
- The recent weekly digest action exists in code but is not reachable in the production journey.

Likely code anchors:
- `app/planning/page.tsx`
- `app/planning/components/exportBriefPanel.tsx`
- `app/planning/components/weeklyDigestDownload.tsx`

Next action:
- Verify `OperationsExecutionStepper` actually renders the active step panel for `ops-export-briefs`.
- Add a route/render test for `/planning#ops-export-briefs` requiring `Default briefs` and `Download weekly digest`.
- If only one step is rendered by design, ensure hash navigation activates the requested step before first paint.

### P1 — Homepage has no rendered `h1`

Route: `/`

Journey: first page load / screen-reader and SEO scan

Observed:
- Production homepage title is present.
- Rendered DOM after load had `h1` count `0`.
- The first visible decision card is substantial, but it lacks a semantic page heading.

Why it matters:
- The weekly brief is the canonical surface and needs a stable semantic heading.
- This weakens accessibility, browser outlines, and automated smoke checks.

Likely code anchors:
- `app/page.tsx`
- `app/components/reportShell.tsx`
- `app/components/weeklyDecisionCard.tsx`

Next action:
- Add one visually appropriate `h1` for the weekly brief shell or canonical weekly card.
- Add a route render test that `/` contains exactly one useful `h1`.

### P1 — “Find a tool” sends users to Resolve instead of a search/tool surface

Route tested: `/search`

Journey: homepage top action → `Find a tool`

Observed:
- `/search` resolved to `https://whether.work/resolve#unresolved-question-router`.
- The page title became `Get help with one decision`.
- The `h1` became `Choose the right help`.
- A search input exists somewhere in the resolved page, but the first scan does not read as “find a tool”.

Why it matters:
- The CTA promises a tool-finding command surface.
- The destination reads as decision help, which can be correct strategically, but the label/destination mismatch creates route uncertainty.

Likely code anchors:
- `app/search/page.tsx`
- `app/resolve/page.tsx`
- `app/components/globalHeader.tsx` or navigation data feeding the `Find a tool` CTA

Next action:
- Either relabel the top CTA to match the Resolve destination, or make `/search` land directly on the toolkit/search section with a visible search field and matching heading.
- Add a smoke assertion for the `Find a tool` destination so future IA changes do not drift silently.

### P2 — Evidence view exposes duplicate visible radio controls

Route: `/evidence`

Journey: Evidence → choose depth → Short read / Deeper evidence

Observed:
- The Evidence view mode rendered both custom `role="radio"` spans and native `input type="radio"` controls.
- Both control layers were visible to Playwright.
- Initial checked controls counted as `2`: one custom role radio and one native input.

Why it matters:
- The visible UI works, but duplicate visible radio controls can create noisy keyboard and assistive-technology behavior.
- This is not blocking the journey, but it weakens the polish of a key proof surface.

Likely code anchor:
- `app/evidence/components/evidenceSections.tsx`

Next action:
- Keep one accessible radio implementation: either use the native input visibly, or visually hide the native input and expose only the Base UI/custom control correctly.
- Add an accessibility-oriented test that the radiogroup exposes exactly two user-facing options.

### P2 — Trust/source handoff wording is not aligned

Routes: `/`, `/trust`

Journey: homepage source board → full trust context

Observed:
- Homepage copy says: `For formulas and full trust context, see /trust.`
- Trust loads correctly and provides the trust snapshot.
- A direct `Source board` disclosure/action was not available on `/trust`.

Why it matters:
- This is not a broken route, but the handoff is less direct than the homepage language suggests.
- Operators looking for the source board details may not immediately find the same object on Trust.

Likely code anchors:
- `app/page.tsx`
- `app/trust/page.tsx`
- shared trust/source components

Next action:
- Either rename the homepage handoff to match Trust’s `Trust snapshot`, or add a source-board anchor/section to `/trust`.

## Passed checks

- `/`, `/evidence`, `/planning`, `/resolve`, `/trust`, `/acceptable-use-policy`, and `/terms-of-service` loaded without browser console errors.
- `/learn` redirected to `/trust`.
- `/operate` returned the intended 404 page.
- Homepage stage personalization changed page text without crashing.
- Homepage `Download briefing pack (.txt)` produced a download.
- Evidence `Open deeper evidence` navigated to `/evidence?signalsView=detail#evidence-priorities`.
- Planning step links updated hash state for Rules and Share.

## Validation commands and tools

- Production browser automation with Node Playwright against `https://whether.work`.
- `bun run smoke:prod` passed after the smoke contract was updated to current IA.
- Source anchors inspected with `rg` and targeted file reads.

## Recommended next fix order

1. Fix homepage PDF download and add a regression test.
2. Fix Planning share step rendering so digest/default briefs are reachable.
3. Add a homepage `h1` and route render assertion.
4. Resolve the `Find a tool` label/destination mismatch.
5. Clean up Evidence radiogroup semantics.
6. Align the homepage trust/source handoff with a `/trust#source-board` section.
