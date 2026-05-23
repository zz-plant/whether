# #16: Universal design system — architecture plan

## What changes

One typographic ramp, one color token system, and one card template across all 60+ component files. The product stops feeling like a collection of pages and starts feeling like one thing.

This is not a visual redesign. It's standardizing what already exists — taking the 4-5 different ways the codebase renders a "card with a label, value, and explanation" and making them one way.

---

## Phase 1: Audit (1 day)

### Typography audit

Current fragmentation across components:

| Pattern | Examples | Issue |
|---|---|---|
| `text-fluid-*` (xs, sm, base, lg, xl, 2xl) | Used in BriefHero, CallModeSections, CommandCenterNavBlock | Fluid scale, but inconsistently applied. Some components use raw `text-sm` instead |
| `text-[clamp(...)]` inline | Used in BriefHero for the dominant number | Custom values that should be tokens |
| `type-kicker`, `type-label`, `type-data`, `type-headline` | Used in CallModeSections, RegimeBanner, DecisionHeroSection | CSS classes already exist — they ARE the proto-design-system. Need to catalog and standardize |
| Raw `text-xs`, `text-sm`, `text-base`, `text-lg` | Used in SensorArray, MacroSignalsPanel, many appendix components | Bypasses the fluid scale |
| `font-display` | Used in BriefHero for the dominant number | Font family token, inconsistently applied |
| `tabular-nums` | Used in ScoreCard, ConfidenceMiniChart | Utility, inconsistently applied |

**Goal**: Every text element maps to one of 6 semantic roles:

```
text-display    → hero numbers, dominant metrics (clamp 2.5rem-6.5rem)
text-heading    → section titles, h1/h2 (text-fluid-xl, text-fluid-lg)
text-body       → paragraphs, descriptions (text-sm, text-fluid-base)
text-data       → scores, metrics, values (tabular-nums, text-fluid-sm)
text-label      → kickers, section labels, metadata labels (text-fluid-xs, uppercase tracking)
text-caption    → footnotes, timestamps, source lines (text-fluid-micro)
```

Each role has fixed: font-size, line-height, font-weight, letter-spacing, font-family. These become CSS custom properties in `tokens.css`.

### Color audit

Current fragmentation:

| Pattern | Examples | Issue |
|---|---|---|
| Raw Tailwind: `text-slate-100`, `bg-slate-950`, `border-slate-800` | Used everywhere | No semantic meaning — you can't tell if `text-rose-200` means "warning" or "error" or "emphasis" |
| CSS custom properties: `--bg-body`, `--color-surface` | Defined in `tokens.css`, used in `layout.css` | Incomplete — only covers backgrounds, not text or borders |
| `weather-chip-*` classes: `weather-chip-slate`, `weather-chip-amber`, `weather-chip-emerald`, `weather-chip-sky`, `weather-chip-rose`, `weather-chip-violet` | Used in CallModeSections, weekly-card components | Proto-semantic tokens — these ARE the right pattern. Need to expand to cover all color usage |
| Inline color values in JSX: `className="text-emerald-200 bg-emerald-500/10"` | Used in BriefHero, ConfidenceGauge, CallModeSections | Duplicated across components, hard to change globally |
| Hardcoded hex values: `#38bdf8`, `#f87171`, `#34d399` | Used in HistoricalTrendChart, SensorArray sparklines | Should be CSS custom properties |

**Goal**: Every color maps to a semantic token:

```
--color-decision-do        → emerald (action now, expand, improve)
--color-decision-pause     → rose (pause if, tighten, warn)
--color-decision-watch     → amber (watch, caution, hold)
--color-decision-flip      → sky (flip if, change course, re-open)

--color-trust-high         → emerald (HIGH confidence, live data, stable)
--color-trust-medium       → amber (MED confidence, cached data, warning)
--color-trust-low          → rose (LOW confidence, degraded, historical)

--color-surface-primary    → slate-950 (main backgrounds)
--color-surface-secondary  → slate-900 (card backgrounds)
--color-surface-tertiary   → slate-800 (inset backgrounds)
--color-border-default     → slate-700/60 (card borders)
--color-border-emphasis    → sky-400/30 (active/highlight borders)

--color-text-primary       → slate-100 (headings, key values)
--color-text-secondary     → slate-300 (body text)
--color-text-tertiary      → slate-400 (labels, descriptions)
--color-text-muted         → slate-500 (captions, metadata)
```

These become CSS custom properties in `tokens.css`, with Tailwind `theme.extend.colors` mappings so both `text-color-trust-high` and raw `text-emerald-200` work during migration.

### Component audit

Current card patterns across the codebase:

| Component | Pattern | Structure |
|---|---|---|
| SensorArray | `weather-panel rounded-lg p-5` → label → value → delta → sparkline → explanation → formula → freshness | Value-first card with trend |
| MacroSignalsPanel | `weather-panel rounded-lg p-5` → header → value → change → interpretation | Similar to SensorArray but different internal layout |
| SourceHealthPanel | Table rows with status badges | Table, not a card |
| postureSummaryCards | `rounded-md bg-slate-950/25 px-3 py-3` → label → value → detail | Compact metric card |
| decision cells | `weather-decision-cell bg-emerald-500/6` → label → value | Tiny decision cell |
| RegimeAssessmentCard | `weather-surface rounded-lg px-4 py-4` → label → description → source | Narrative card |
| SignalMatrixPanel | Grid of mini-cards | Composite card grid |
| Warning cards | `rounded-md border border-slate-700/70 bg-slate-950/50 px-3 py-3` → title → detail | Alert/warning card |

**Goal**: One `DataCard` component with slots, used everywhere:

```typescript
<DataCard
  variant="metric"          // compact (postureSummaryCards, decision cells)
         | "reading"        // standard (SensorArray, MacroSignalsPanel)
         | "narrative"      // prose (RegimeAssessmentCard, warning cards)
  label="Credit tightness"
  value={74}
  delta={{ value: 2.3, direction: "up" }}
  interpretation="Tightening signals suggest reducing burn."
  source={{ label: "FRED", freshness: "live" }}
  sparkline={sparklineData}
/>
```

---

## Phase 2: Token definition (1 day)

### Update `tokens.css`

Add CSS custom properties for the typographic ramp and semantic colors. Keep existing tokens for backward compatibility, add new ones alongside.

```css
:root {
  /* === Typography (new) === */
  --text-display-size: clamp(2.5rem, 7vw, 6.5rem);
  --text-display-leading: 1;
  --text-display-weight: 700;

  --text-heading-size: clamp(1.25rem, 1rem + 1.4vw, 2.15rem);
  --text-heading-leading: 1.15;
  --text-heading-weight: 600;

  /* ... etc for body, data, label, caption */

  /* === Colors (new semantic layer) === */
  --color-decision-do: #6ee7b7;        /* emerald-300 */
  --color-decision-pause: #fda4af;     /* rose-300 */
  --color-decision-watch: #fcd34d;     /* amber-300 */
  --color-decision-flip: #7dd3fc;      /* sky-300 */

  /* ... etc for trust, surface, border, text tokens */
}
```

### Update Tailwind config

Map semantic tokens to Tailwind's theme so existing `text-*` and `bg-*` classes continue to work:

```javascript
// tailwind.config.ts (or equivalent)
theme: {
  extend: {
    colors: {
      'decision-do': 'var(--color-decision-do)',
      'decision-pause': 'var(--color-decision-pause)',
      // ...
    }
  }
}
```

---

## Phase 3: DataCard component (1 day)

### Create `app/components/DataCard.tsx`

One card component with three variants, replacing 5+ current patterns.

**Variant: `metric`** — compact stat card (replaces postureSummaryCards, decision cells)

```
┌──────────────────┐
│ LABEL             │
│ 74                │  ← value (large, tabular-nums)
│ ↑ 2.3 pts         │  ← delta (colored, with arrow)
└──────────────────┘
```

**Variant: `reading`** — full sensor/macro reading card (replaces SensorArray, MacroSignalsPanel)

```
┌──────────────────────────────┐
│ Sensor Label    [LIVE badge] │
│ 5.25%           Δ +0.12 bps  │
│ ──────────────────────────── │
│ [sparkline]                   │
│ Interpretation: [explanation] │
│ Formula · Source · Freshness  │
└──────────────────────────────┘
```

**Variant: `narrative`** — prose card (replaces RegimeAssessmentCard, warning cards, decision summary)

```
┌──────────────────────────────┐
│ Section Title                 │
│ Description paragraph text    │
│ [optional source/freshness]   │
└──────────────────────────────┘
```

The DataCard handles:
- Consistent padding (`px-4 py-4` or `px-5 py-5`)
- Consistent border radius (`rounded-lg`)
- Consistent surface color (using semantic token)
- Label/value/delta/interpretation/source slot layout
- Sparkline rendering (extracted from SensorArray)
- Status badge rendering (extracted from SeriesFreshnessBadge)

---

## Phase 4: Incremental migration (2-3 weeks)

Migrate one surface at a time. Each migration is a standalone PR that:
1. Replaces existing card markup with DataCard
2. Runs the existing test suite to catch regressions
3. Gets visual review

### Migration order (least risk first)

| Week | Surface | Components | Risk |
|---|---|---|---|
| 1 | postureSummaryCards in CallModeSections | 1 component | Low — compact metric cards, well-tested |
| 1 | Decision cells in WeeklyDecisionCard | 1 component | Low — tiny cards, well-tested |
| 1 | Warning cards in trust page | 2 components | Low — simple narrative cards |
| 2 | SensorArray | 1 component | Medium — complex sparkline rendering, need to extract |
| 2 | MacroSignalsPanel | 1 component | Medium — similar to SensorArray |
| 2 | SourceHealthPanel | 1 component | Medium — table format, needs DataCard table variant |
| 3 | RegimeAssessmentCard | 1 component | Low — simple narrative card |
| 3 | SignalMatrixPanel | 1 component | Medium — composite grid |
| 3 | Evidence sections, remaining appendix panels | 5-8 components | Low — mostly narrative/stats cards |

### Migration pattern

For each component:
1. Read the current markup
2. Map to DataCard props (variant, label, value, delta, interpretation, source, sparkline, children)
3. Replace markup with `<DataCard ... />`
4. If DataCard doesn't support a needed pattern, extend DataCard (don't create a new pattern)
5. Run `bun run test` — existing tests should pass without changes (DataCard renders the same semantic HTML)
6. If tests fail, check that CSS classes on rendered output match. DataCard may produce slightly different class names — update test assertions to match the new semantic tokens

---

## Phase 5: Enforcement (1 day)

### Add linting rules

```javascript
// eslint custom rule: no raw color values in JSX className
// Instead of: className="text-emerald-200"
// Use:       className="text-decision-do"
// Or use semantic Tailwind classes that map to tokens

// Opt-in: add to eslint config as warnings first, then errors after migration
```

### Add DataCard usage guideline to AGENTS.md

```
## DataCard rule
When rendering a card with a label, value, delta, or interpretation,
use <DataCard> from app/components/DataCard.tsx.
Do not create new card patterns.
If DataCard doesn't support your use case, extend DataCard's variant prop.
```

---

## Files summary

| File | Action | Purpose |
|---|---|---|
| `app/styles/tokens.css` | Modify | Add typographic ramp + semantic color tokens |
| `tailwind.config.ts` (or equivalent) | Modify | Map semantic tokens to Tailwind theme |
| `app/components/DataCard.tsx` | Create | Universal card component (3 variants) |
| `AGENTS.md` | Modify | Add DataCard usage rule |
| `eslint.config.*` | Modify | Add no-raw-color lint rule (warning) |
| ~15-20 component files | Modify | Migrate from raw markup to DataCard |

---

## Risks

| Risk | Mitigation |
|---|---|
| Migration breaks visual layout | Each migration is a standalone PR with visual review. Semantic tokens produce the same colors as the raw Tailwind classes they replace |
| DataCard doesn't cover all patterns | Extend DataCard variants, don't create new patterns. The variant prop is intentionally extensible |
| Performance regression from abstraction | DataCard is a thin wrapper — same DOM nodes, same CSS. No runtime overhead beyond one extra function call |
| Migration takes too long | Prioritize by visibility. Homepage components first, appendix panels last. The homepage is 80% of the visual impact |
| Team resists the abstraction | DataCard is opt-in during migration. Existing code continues to work. New code uses DataCard. Old code migrates gradually |

---

## Effort estimate

| Phase | Days | Deliverable |
|---|---|---|
| Audit | 1 | Catalog of every text size, color value, and card pattern in the codebase |
| Token definition | 1 | Updated tokens.css + Tailwind config with semantic tokens |
| DataCard component | 1 | DataCard.tsx with 3 variants, unit tests |
| Migration (per week) | 5 | 5-8 components migrated per week |
| Enforcement | 1 | Lint rules + docs update |
| **Total** | **3-4 weeks** | (2-3 weeks migration + 1 week setup/enforcement) |

---

## Success metrics

- **0 raw color values** in JSX className props (only semantic tokens or DataCard props)
- **1 card component** used everywhere (DataCard replaces 5+ patterns)
- **6 text roles** covering every text element (no raw font-size values)
- **0 visual regressions** (test suite + visual review confirms)
- **New components use DataCard by default** (AGENTS.md rule enforced)
