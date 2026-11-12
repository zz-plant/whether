---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/layout.tsx","app/history/page.tsx"]
---

# Surface brief: the site frame and This week (`/`)

Scope: every route's frame (navigation, record band, document) and the homepage first screen. Visitor mode: Read. The full design brief is `docs/design/rebuild-covenant.md`; this file holds the build contract only.

Audience and job: a founder reading on a Monday with a decision in flight; peers arriving cold (engineers, investors, designers). First screen must hold this week's guidance, whether anything moved, five areas with action and line, both scores.

Owner decisions (2026-11-10): one PR for the whole site; vector band with a month readout on every route plus a canvas rendering on History; History states the two differing records as facts with no cause; theme follows the device setting unless a choice is stored.

## Direction contract

THESIS: The weekly brief is the week's weather report for a startup: the condition is the sky, and how to proceed follows from it. The page reads like a modern weather app — glanceable, condition-driven, calm — structured as a filed brief an investor could forward. It refuses the credit-agreement document and the editorial broadsheet alike.

OWN-WORLD: A condition-tinted sky (Sunny warm gold-white, Cloudy overcast grey-blue, Stormy deep slate, Freezing icy pale) behind a light paper body; the condition is the page's ground, not just a word, so a storm week and a sunny week look like different apps. Two voices: **Bricolage Grotesque** sets the display (guidance, condition word, score figures, wordmark) with its distinctive, slightly quirky letterforms that avoid the geometric-sans monoculture; **Source Sans 3** sets everything that explains (body, labels, area names) in a clean professional grotesque. Type roles: display (800, 28-40px, tracking -.02em, line-height 1.05); figure (800-900, 52-64px, tabular lining, tracking -.04em); heading (600-700, 16-20px); body (400, 15px, 1.6 line-height, 64ch measure); label (600, 11px, uppercase, .12em tracking); area (600, 16px). Hairlines and section rules; elevated surfaces (cards, buttons) carry a layered multi-shadow (three layers, Stripe/Linear style) for physical depth. Metric rows like an investor update. The record band becomes a weather strip: condition fields as sky, scores as large numerals. A condition glyph (sun/cloud/storm/snow) beside the word, so colour is never the only carrier. Controls, links and focus rings stay in the ink in every week. No glow halos (AI-pattern tell); no zero-offset shadows. Layering: the sky carries atmospheric depth (soft animated cloud masses at different positions, slow drift), while the body stays flat and readable.

STORY: The visitor glances at the sky and knows the week's weather; reads the guidance; checks the five areas and two scores; copies or shares. The condition drives the whole page.

FIRST VIEWPORT: Sky band (full width, condition-tinted, ~200px desktop / ~120px phone): condition glyph + word large, guidance as the `h1` in display weight, both scores as large numerals. Then the body: five area rows with action and line, trust facts, copy and subscribe. Phone: sky band stacks, scores below the guidance.

FORM: User-pinned hybrid of filed brief (Data Room) + investor-update letter + modern weather-app condition theming. Signature interaction: moving along the weather strip reads out that month's condition and scores, and the page's sky tints to that month. Motion grammar: the sky cross-fades on a condition change (300ms); area rows tick on a week that moved; reduced motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Records

- Build path: code-led. No comp was approved. The renders in `.impeccable/mocks/covenant/` and `docs/design/rebuild-covenant/` are references drawn while writing the brief, not approved pictures; the owner chose the direction by name ("Covenant") from the decision round.
- Seed: the direction roll printed key `2b9b0296` (scope direction, mode read, seven candidates, assigned index 3). The decision page for that hand was served under question key `f747439f`.
- Finish review, round 1 (2026-11-10): disposition fix, eight material items. Applied in one batch: both scores on a phone; area rows with the action; the score figure with one sentence and a ruled line named in place; the week line with the brief's number, the gloss and the stage line; title-first report intros and no side stripe; History's rows, field names, patterned week cells and misses in the caveat's ink. Not applied: one frame across report routes.
- Forecast build (2026-11-12, PR #1819, on the owner's request to propagate the direction): code-led again, no comp. Built: Bricolage Grotesque and Source Sans 3 self-hosted with metric-matched Arial stand-ins (Besley and Archivo removed from `public/fonts`); the Forecast palette in both themes across every route, with the condition fills re-picked against simulated colour-vision deficiency (closest pair Cloudy/Stormy, 16.5 OKLab) and `REGIME_HEX_COLORS`, the OG inks and the asset kit regenerated to match; the sky on the homepage's first screen, per condition and theme, inks at 4.5:1 or better at both ends, the scores on a panel of paper, four drifting clouds that hold still under reduced motion; `--elev-card` on cards and the sky's panel, `--elev-control` on buttons. Not adopted: the tracked uppercase label (capitals stay for stamps, ui-ux-standards §XVIII). Left for the follow-up below.
- Forecast follow-up (2026-11-12, PR #1820, the owner's "do the rest"): the record band is the weather strip (each field a small sky; the readout as a card with the month's condition and its two scores as large figures); reading a month tints the homepage's sky to it, and the sky cross-fades between conditions in 300ms (`@property`-registered colours), still under reduced motion; the share cards, the brand kit (`docs/assets`) and the asset kit draw Bricolage Grotesque and Source Sans 3 from rebuilt static instances, with the wrap estimates re-measured (`lib/image/textFit.ts`); `.impeccable/design.json` regenerated from DESIGN.md (ramps by the tool's rule, eight OKLCH lightness steps from 0.15 to 0.95; unchanged colours keep their ramps); `/history/compare` names both periods' conditions in the running head, which took its frames off the `ui:frames` failures (desktop had failed on production too).
