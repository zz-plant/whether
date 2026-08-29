# UI facelift plan

Date: 2026-08-29
Method: fresh captures of `/`, `/signals`, `/operate`, `/answer`, `/trust` via `bun run ui:iterate`,
cross-referenced against `app/styles/`, `docs/agents/ui-ux-standards.md`, and
`docs/one-screen-weekly-brief-spec.md`.

## The stance this plan takes

AGENTS.md is explicit that this repo optimizes for **decision transmission**, not UI ornament. A
facelift here is therefore not a restyle for its own sake. Every item below is justified by one of:
the brief is faster to read, the artifact screenshots better, or the theme stops breaking.

Two things follow from that, and they are the guardrails for this work:

- **Non-goals.** No new routes, no new posture vocabulary, no nav reshuffle, no component library
  swap, no motion/illustration additions. Route renames are an explicit AGENTS.md non-goal and are
  excluded even where the names are inconsistent.
- **The screenshot card contract binds.** `docs/one-screen-weekly-brief-spec.md` already requires
  "one card, one viewport, no scroll", "no methodology callouts", and — directly relevant below —
  "line lengths must avoid wrapping at typical Slack preview widths". Phase 1 is largely enforcement
  of a contract already written.

## What the captures actually show

Measured 2026-08-29 (full-page height ÷ viewport height):

| Surface | Viewport | Page height | Screens |
| --- | --- | --- | --- |
| `/` mobile | 430×932 | 3066px | 3.3 |
| `/` desktop | 1600×1400 | 2033px | 1.5 |
| `/signals` desktop | 1600×1400 | 4546px | 3.2 |

Five findings, ordered by leverage rather than by how visible they are.

### A. The brief is set in a terminal register, not an operator register

On `/`, every bounded decision renders its threshold as monospace in saturated green and amber on
near-black:

```
Stop or tighten if:  net-new hiring if funding pressure rises above 76 or risk appetite falls below 44
Open up again when:  staged approvals when funding pressure falls below 66 and risk appetite is above 54
```

Three problems, in order of cost:

1. **It wraps.** At 430px those lines break across three monospace rows. The spec forbids exactly
   this for the shared artifact. Monospace is the worst possible face for the longest strings on the
   smallest screen.
2. **Colour is carrying meaning it cannot carry.** Green/amber/red are doing double duty — semantic
   posture (tighten vs. loosen) *and* syntax highlighting. A reader cannot tell whether green means
   "good" or "this is a value". `--color-semantic-*` tokens already exist for the posture meaning.
3. **Register mismatch.** The product's stated identity is meeting shorthand and a Slack screenshot
   for founders and CFOs. Neon-on-black monospace reads as a developer tool. This is the single
   largest gap between what the product says it is and what it looks like.

Monospace is defensible for *bare numerals* in a comparison column (`52/100`, `0.29%` on `/signals`
read fine). It is not defensible for prose-shaped rules.

### B. The light theme is a patch layer that keeps breaking

`app/styles/tokens.css` carries **37 attribute-selector rules and 28 `!important` declarations** that
repair light mode by pattern-matching Tailwind *class names*:

```css
html[data-theme="light"] [class^="text-emerald-1"], … { color: #047857 !important; }
```

The file's own comments record the failure mode — the enumerated form "silently missed /60 and the
-100 shades, which is how '54/100 - low' and the active nav pills ended up near-white on near-white."
This is a layer that has already shipped contrast bugs more than once.

**The repo has already solved this correctly, once.** The `@theme inline` block remaps the slate text
scale to theme roles, with the comment *"Replaces the former per-theme !important class patches."*
That pattern works and is proven in this codebase. It simply was never extended past grey text.

Remaining, unmigrated: **587** semantic-hue call sites (emerald/amber/sky/rose 100–400) and **435**
`bg-`/`border-slate-800|900|950` call sites.

This is listed second by visibility and first by sequence: **you cannot safely recolour anything while
a layer overrides by class name.** Phase 1 depends on this landing first.

### C. `/signals` restates its own state four times before the first task block

§XI of the standards says never to stack repeated state summaries ahead of page content. The capture
shows, top to bottom, before any evidence appears:

1. intro card — "Sunny · Trust constrained · As of Jun 17, 2026 · Cached snapshot"
2. a "Live update delayed" banner
3. **What this means now** — "Current outlook: Conditions holding…"
4. **Current environment / Confidence / Decision as-of / Freshness** — posture and freshness again
5. heading: "Sunny is the current funding environment."

Freshness alone appears three times in different words. The page is 4546px; roughly the first 900px
are chrome restating what the intro line already said.

Nesting compounds it: **What this means now** is a card containing three bordered sub-cards, one of
which contains two further tinted cards — three containment levels for one paragraph of content.

### D. Eyebrow labels have stopped creating hierarchy

`/signals` uses uppercase letterspaced micro-labels for *every* section — WHAT THIS MEANS NOW,
CURRENT OUTLOOK, THIS WEEK, ALSO MOVED, TRENDS, KEY NUMBERS, DEPTH, CURVE CONTEXT. When every block
has the same eyebrow treatment, the treatment ranks nothing. Combined with generous uniform section
gaps, the page reads as a flat list of equally important things — the opposite of a brief.

### E. Trust compacts to nothing on mobile

Desktop `/` shows `Snapshot · FRED · Jun 17, 2026 · Confidence LOW · Using cached data`. The mobile
capture shows **`Snapshot`** alone. Source, date, and confidence are dropped precisely where the
screenshot gets taken and shared. AGENTS.md rule 4 asks for trust to be *compact*, not absent — and
"Confidence: LOW" is a required field of the screenshot contract.

### F. Hygiene, cheap and unglamorous

- **Reduced motion:** 5 of 14 stylesheets have a `prefers-reduced-motion` block. `layout-shells.css`
  (11 transitions), `feedback.css` (6), `decision-flow.css` (5), and `home-flow.css` (5) have none —
  27 unguarded transitions.
- **Chart labels collide:** on `/signals` curve context, the `10Y-2Y` and `2Y-3M` series labels
  overlap each other and the plotted lines at the top right.
- **Doc drift:** §VIII and §XI of `docs/agents/ui-ux-standards.md` govern `/evidence`, `/planning`,
  `/resolve`, and `/learn`. **None of those routes exist** — they are `/signals`, `/operate`,
  `/answer`. The canonical UI doc currently names four routes that 404.

## Sequenced plan

Ordered so each phase unblocks the next. Phases 0 and 3 are independently shippable at any time.

### Phase 0 — Retire the patch layer (foundation, no intended visual change)

Extend the proven `@theme inline` remap to the hues, surfaces, and rings; delete the corresponding
`!important` attribute-selector rules.

- Map `--color-emerald|amber|sky|rose-{100..400}` to semantic role tokens with per-theme values,
  the way `--color-slate-*` already maps.
- Map `--color-slate-{800,900,950}` to the existing `--bg-*` surface ladder.
- Move focus rings (`outline-sky-*`, `ring-sky-*`, 51 usages) onto a single `--focus-ring` token.
- Preserve the two documented carve-outs: regime shells in `lib/regimePresentation.ts` stay dark in
  both themes, and `text-<hue>-50` is light text on those shells.

**Done when:** the 37 attribute-selector rules are gone, dark mode is pixel-identical, and light mode
is unchanged or better. Verify by capturing both themes before and after.

**Risk:** medium and well-bounded — it is a find/replace at the token layer, not at 1,022 call sites.
The carve-outs are the only real trap, and both are already commented in place.

### Phase 1 — Re-register the weekly brief (the visible facelift)

Scope: `app/page.tsx`, `app/components/DecisionHero.tsx`, `ThreeWhethersCard.tsx`,
`app/styles/decision-flow.css`.

- **Set bounded rules in the text face, not monospace.** Keep monospace for bare numerals only.
- **Give the threshold its own line and a numeric emphasis**, so the operator sees `76` and `44`
  without reading the sentence. Reserve weight, not hue, for the number.
- **Reduce hue to posture semantics only** — one colour for tighten, one for loosen, drawn from
  `--color-semantic-*`. Values stop being coloured.
- **Guarantee no wrap at 430px** for `Do now` / `Stop or tighten if` / `Open up again when`. This is
  the pass/fail check, and it is already spec.
- **Restore the provenance line on mobile** to at least source · date · confidence.

**Done when:** the mobile brief carries the full trust line, no bounded-decision line wraps at 430px,
and the top-half screenshot still satisfies the spec's pass/fail check.

### Phase 2 — Compress the report shell

Scope: `app/components/reportShell.tsx`, `app/components/report-shell/*`, `app/signals/`.

- **Collapse the pre-content stack to the §XI tiers**: route context → one intro block → first task
  block. State gets stated once. Merge the "Current environment / Confidence / Decision as-of /
  Freshness" card into the intro line it repeats.
- **Flatten card-in-card past two levels.** Inner tinted cards become labelled rows.
- **Ration the eyebrow.** Reserve uppercase micro-labels for true section starts; demote the rest to
  bold text or drop them where the heading already says it.
- **Tighten vertical rhythm** to a two-step scale (within-section, between-section) instead of one
  uniform large gap.

**Target:** `/signals` under ~3200px desktop (from 4546px) and `/` mobile under ~2600px (from 3066px),
with no content removed — only de-duplicated. Track heights in the capture manifest so the number is
checked, not asserted.

### Phase 3 — Hygiene

- `prefers-reduced-motion` blocks for `layout-shells.css`, `feedback.css`, `decision-flow.css`,
  `home-flow.css`; reduced-motion users get the end state, per §IX.
- Fix the curve-context label collision (offset labels or move to an inline legend).
- Correct §VIII/§XI route names in `docs/agents/ui-ux-standards.md` to `/signals`, `/operate`,
  `/answer`; note that `/learn` no longer exists.

## Verification

Per phase: `bun run lint`, `bun run typecheck`, targeted tests, then
`bun run ui:iterate` and *look at the PNGs* in both themes — the standards skill is explicit that
visual work is reviewed by looking, not by reasoning. `bun run check` before merge.

Phase 0 additionally needs a light/dark capture pair before and after, since its whole claim is that
nothing visible changed in dark and nothing regressed in light.

## What this plan deliberately does not do

- No route renames (AGENTS.md non-goal), even though `/signals` is labelled "Evidence".
- No migration of the 2,954 palette utilities at their call sites. Phase 0 makes that unnecessary by
  fixing the token layer instead; a call-site sweep would be a large diff with no user-visible gain.
- No change to the decision vocabulary, thresholds, or any `lib/` logic. This is presentation only.
