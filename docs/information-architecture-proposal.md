# Information architecture (IA) proposal (v2)

This proposal recommends a unified IA that keeps the current top-level labels but clarifies ownership boundaries, route intent, and migration rules for legacy surfaces.

## Goals

1. Reduce route ambiguity between decision workflows and reference content.
2. Make user journeys predictable: **understand → decide → plan → learn → trust-check**.
3. Keep SEO continuity while consolidating legacy hubs.

## Proposed primary IA (canonical)

- **Command Center** (`/`) — current climate summary + immediate call.
- **Decide** (`/decide`) — evidence, posture confidence, and short-horizon choices.
- **Plan** (`/plan`) — execution workflows, role/situation pathways, and operating plans.
- **Learn** (`/learn`) — reusable concepts, diagnostics, and practical references.
- **Method** (`/method`, canonical alias to `/methodology`) — formulas, provenance, and trust framing.

## Ownership model (what belongs where)

### Decide owns
- Signal interpretation (`/signals`)
- Posture context (`/posture/*`)
- Decision-specific operations diagnostics (`/operations` decision lanes)

### Plan owns
- Role and situation workflow entry points (`/use-cases/*`)
- Solution execution pathways (`/solutions/*`)
- Plan-oriented briefs and sequencing patterns

### Learn owns
- Toolkit references (`/toolkits/*`)
- Canon/failure-mode learning assets (`/library/*`)
- Conceptual guidance (`/concepts/*`) and non-planning guides

### Method owns
- Data + formula transparency (`/methodology`)
- Confidence/provenance interpretation

## Legacy route policy (proposed)

Keep deep legacy routes available for continuity, but unify **top-level entry points**:

| Legacy entry | Canonical destination | Policy |
| --- | --- | --- |
| `/guides` | `/learn` | 301 redirect |
| `/solutions` | `/plan` | 301 redirect |
| `/brief` | `/start` | 301 redirect |
| `/brief/stage` | `/plan` | 301 redirect |
| `/onboarding` | `/start` | 301 redirect |

## Navigation contract

1. Main nav must always expose: `Command Center`, `Decide`, `Plan`, `Learn`, `Method`.
2. Any page linked from hero or home “Explore next” modules should use canonical IA routes, not legacy hubs.
3. Cross-links should follow this loop:
   - Decide pages link forward to Plan and supporting Learn pages.
   - Plan pages link back to Decide evidence and out to Learn assets.
   - Learn pages link to Method for provenance.

## Content boundary decisions

- Keep `/about` as company/contact/subscription only.
- Keep explanatory model/trust content under Method surfaces.
- Avoid duplicating “how it works” content across About + Method.

## Rollout plan

### Phase 1 — IA consistency hardening
- Normalize nav labels and cross-links to canonical IA routes.
- Keep existing deep content routes intact.

### Phase 2 — Canonical signals
- Add canonical tags from legacy hubs to IA canonical routes.
- Ensure sitemap priority favors `/decide`, `/plan`, `/learn`, `/method` families.

### Phase 3 — Migration quality gates
- Require no critical funnel regressions before expanding redirects.
- Track path adoption (legacy vs canonical) and decide if additional alias cleanup is needed.

## Success metrics

- Higher completion of `Decide → Plan` path.
- Lower backtracking between workflow pages and reference pages.
- Higher Method page opens from decision/planning contexts.
- Reduced traffic share on legacy top-level hubs.

## Open decisions

1. Should `/start` remain separate from Plan, or become a Plan subsection once onboarding intent stabilizes?
2. Should Learn split by persona (PM/Eng/Exec) at top level, or stay single-hub with filters?
3. What adoption threshold should trigger stricter redirect/canonical enforcement?
