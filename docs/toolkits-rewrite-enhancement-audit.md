# Toolkit pages rewrite vs enhancement audit

Date: 2026-03-06

This audit answers: **which toolkit pages need a rewrite vs targeted enhancement**.

## Decision summary

| Page/Surface | Recommendation | Why |
| --- | --- | --- |
| `/toolkits` | **Enhancement** | Core structure is correct (search + inventory grid), but selection support is weak for fast operator routing. Keep the route; add stronger “pick the right toolkit now” affordances. |
| `/toolkits/[slug]` | **Rewrite (content architecture), not route** | Detail pages are comprehensive but read like a long checklist. They should lead with decision delta, bounded thresholds, and reversal triggers before method detail. |
| `/start` toolkit block | **Enhancement** | This section already supports the “run one toolkit” path; tune progressive disclosure and recommendation quality rather than rebuild. |
| `/decide/[slug]` recommended toolkits | **Enhancement** | Routing logic and linkage exist; improve recommendation clarity with “why this toolkit now” context and tighter ordering. |

## Per-page notes

### 1) `/toolkits` — enhancement

Current strengths:
- Includes direct query filtering, intent shortcuts, and result counts.
- Provides a fast index for all toolkit entries.

Enhancements needed:
- Surface active intent state more explicitly (query chip + one-click removal near input).
- Add lightweight reason labels per result (e.g., “best for irreversible commitments”).
- Improve no-result recovery with “closest toolkit” suggestions instead of only broader keyword guidance.

Why enhancement (not rewrite):
- The page already fits the library/index job; changes are interaction-quality upgrades.

### 2) `/toolkits/[slug]` — rewrite the page narrative

Current strengths:
- Rich structure (prep, sequence, success signals, instruments, mistakes, canon links).
- Good operational depth for teams that already know they picked the right toolkit.

Rewrite targets:
- Lead with **decision delta first**: what changed, what to tighten/loosen, and what decision this session should produce.
- Add bounded controls near the top: threshold, stop condition, and reversal condition.
- Compress supporting method sections below the fold so screenshot/share value is preserved.
- Replace implicit instrument→canon mapping with explicit instrument-purpose context where possible.

Why rewrite (not enhancement):
- The current flow is method-first. To match product direction, these pages should become decision-first artifacts with bounded calls.

### 3) `/start` toolkit section — enhancement

Current strengths:
- Already frames a single-path journey (posture → situation → toolkit).
- Uses progressive disclosure for additional toolkits.

Enhancements needed:
- Narrow visible defaults to the top few posture/situation-matched toolkits.
- Add clearer “run now” framing (runtime + expected artifact in card preview).
- Reduce card copy to preserve quick scanning on mobile.

Why enhancement (not rewrite):
- Page role is valid and aligned with weekly ritual; this is prioritization and compression work.

### 4) `/decide/[slug]` toolkit recommendations — enhancement

Current strengths:
- Has route-level recommendation wiring for role and situation entry points.
- Connects users directly into toolkit detail pages.

Enhancements needed:
- Show rationale per recommendation (“recommended because…”).
- Order recommendations by immediacy and reversibility for faster execution.
- Add one-line expected output so users know what artifact they will leave with.

Why enhancement (not rewrite):
- Core topology is already useful; value comes from stronger recommendation quality and transmission.

## Suggested sequence

1. Rewrite `/toolkits/[slug]` top section into decision-first summaries.
2. Upgrade `/toolkits` selection affordances and recovery states.
3. Tighten `/decide/[slug]` recommendation rationale and ordering.
4. Tune `/start` toolkit card compression for mobile decisiveness.
