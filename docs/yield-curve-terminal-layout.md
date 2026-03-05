# Yield Curve Terminal: One-Screen Layout Proposal

This layout is designed to feel like a Bloomberg-style terminal page while using only:

- **Rates:** `oneMonth`, `threeMonth`, `twoYear`, `tenYear`
- **Spreads:** derived from rates (e.g., `tenYear - twoYear`, `twoYear - threeMonth`)
- **Curve signal:** one derived scalar per period (defined below)

Source schema: `data/time_machine_cache.json` entries with `record_date`, `fetched_at`, `isLive`, and `yields` fields.

---

## Canonical derived fields (compute once per period)

Given yields in percentage points:

- `r1m = yields.oneMonth`
- `r3m = yields.threeMonth`
- `r2y = yields.twoYear`
- `r10y = yields.tenYear`

Derive:

- `s10_2 = r10y - r2y`
- `s2_3m = r2y - r3m`
- `curve_level = (r1m + r3m + r2y + r10y) / 4`
- `curve_signal = 0.7 * s10_2 - 0.3 * s2_3m`

Interpretation:

- `curve_signal > 0`: normal/steep bias
- `curve_signal ≈ 0`: transition/flat bias
- `curve_signal < 0`: inversion bias

---

## Exact one-screen layout (5 panels)

Use a **12-column by 8-row grid** with compact legends and shared time cursor.

### 1) Regime Ribbon + Curve Signal (top strip)
- **Grid:** columns 1-12, rows 1-1
- **Chart type:** dual-layer strip
  - Background ribbon color by `curve_signal` bucket:
    - `< -0.25`: inversion (red)
    - `-0.25 to 0.25`: flat (amber)
    - `> 0.25`: steep/normal (green)
  - Overlay thin line: `curve_signal`
- **Purpose:** immediate "state" read before details.

### 2) Rate Stack (core market panel)
- **Grid:** columns 1-8, rows 2-5
- **Chart type:** 4-line time series (`r1m`, `r3m`, `r2y`, `r10y`)
- **Interaction:** timeframe toggle at panel header:
  - Weekly sample
  - Monthly average
  - Yearly average
- **Purpose:** term-structure context and cross-tenor moves.

### 3) Inversion Timeline (stress panel)
- **Grid:** columns 1-8, rows 6-8
- **Chart type:** 2-line spread series (`s10_2`, `s2_3m`) + zero baseline
- **Rule:** shade area where each spread `< 0`
- **Purpose:** clear inversion episodes and persistence.

### 4) Steepness vs Level Scatter (regime map)
- **Grid:** columns 9-12, rows 2-5
- **Chart type:** monthly scatter
  - X-axis: `r2y`
  - Y-axis: `s10_2`
  - Color: year
- **Overlay:** crosshairs at `(median r2y, 0)`
- **Purpose:** compact macro regime clustering without extra taxonomy.

### 5) Shock Ladder (event tape)
- **Grid:** columns 9-12, rows 6-8
- **Chart type:** ranked horizontal bars (Top 10 absolute weekly deltas)
  - Two grouped sections: `Δr2y` and `Δr10y`
  - Label each bar: week ending date + signed bps move
- **Purpose:** "what just happened" and historical comparability.

---

## Terminal-style UX details

- **Header row:** `YCURVE | Last: <record_date> | Source: <source> | Live/Cache: <isLive>`
- **Shared vertical cursor:** one hover date updates all panel tooltips.
- **Consistent units:**
  - rates in `%`
  - spreads and weekly changes in `bp`
- **Color discipline:**
  - rates = neutral palette
  - spreads/signal = semantic palette (green/amber/red)
- **Default timeframe:** monthly average (highest signal-to-noise).

---

## Minimal data contract from cache

Per period record (already present in cache):

- `record_date`
- `fetched_at`
- `isLive`
- `yields.oneMonth`
- `yields.threeMonth`
- `yields.twoYear`
- `yields.tenYear`

No additional external sources are required for this screen.
