# Information architecture (IA) change proposal

This proposal updates Whether IA with implementation-ready changes tied to current navigation, route inventory, and user jobs.

## Current-state snapshot (source of truth)

### Current main nav (implemented in `reportPageLinks`)
- `Command Center` → `/`
- `Decide` → `/decide`
- `Plan` → `/plan`
- `Learn` → `/learn`
- `Method` → `/method`

### IA unification notes (implemented)
- Legacy `guides` entry now routes to `Learn` (`/learn`).
- Legacy `solutions` entry now routes to `Plan` (`/plan`).
- Legacy `brief` routes now point to the unified intake or planning surfaces (`/start`, `/plan`).

## IA problems to solve

1. **Documentation and workflow are split across too many labels**
   - "Toolkits", "Library", "Concepts", "Guides", and "Methodology" are all learning/reference surfaces but are fragmented.

2. **Main nav does not mirror the primary user journey**
   - Typical flow is: understand climate → decide action → plan execution → learn details.
   - Existing nav mixes onboarding labels (`Start Here`) with content containers (`Library`) and omits decision hubs (`signals`, `operations`).

3. **Critical trust docs are discoverable but not structured**
   - `About` mixes product narrative, trust context, and contact.
   - `Methodology` is separate and not consistently adjacent to other trust cues.

## Proposed top-level IA

Adopt five persistent destinations:

1. **Command Center** (`/`)
   - Current weekly posture and immediate action.

2. **Decide** (`/decide`)
   - Consolidates `/signals`, `/posture`, and decision-focused `/operations` views.

3. **Plan** (`/plan`)
   - Consolidates `/solutions/*`, `/use-cases/*`, and planning-specific guides.

4. **Learn** (`/learn`)
   - Consolidates `/toolkits`, `/library/*`, `/concepts/*`, and reference guides.

5. **Method** (`/method` aliasing `/methodology`)
   - Source logic, formulas, confidence framing, and provenance.

## Proposed main nav changes (concrete)

### Replace current nav with
- `Command Center` (`/`)
- `Decide` (`/decide`)
- `Plan` (`/plan`)
- `Learn` (`/learn`)
- `Method` (`/method`)

### What moves where
| Existing route | New canonical home | Rationale |
| --- | --- | --- |
| `/start`, `/onboarding`, `/brief` | `/start` (single intake funnel) | One entry path avoids duplicated onboarding intent |
| `/signals`, `/posture`, `/operations` (decision panels) | `/decide/*` | Decision-making surfaces grouped together |
| `/solutions/*`, `/use-cases/*`, planning guides | `/plan/*` | Workflow outputs grouped under execution planning |
| `/toolkits`, `/library/*`, `/concepts/*`, non-planning guides | `/learn/*` | Documentation + reusable knowledge unified |
| `/methodology`, trust internals from `/about` | `/method/*` | Consistent trust and model-transparency surface |

## Documentation placement changes

1. Move high-level "How it works" content from `/about` into `/method/overview`.
2. Keep company/contact/subscription info in `/about` only.
3. Add clear cross-links:
   - `/learn/*` pages link to `/method` for source/provenance.
   - `/decide/*` and `/plan/*` pages link to the exact supporting `/learn/*` assets.

## URL + SEO transition plan

1. Add aliases first (`/decide`, `/plan`, `/learn`, `/method`) with existing pages rendered behind wrappers.
2. Keep legacy URLs active with canonical tags pointing to new route families once parity is complete.
3. Add permanent redirects only after analytics show stable adoption.
4. Update `app/sitemap.ts` in phases so new families gain priority gradually.

## Rollout phases

### Phase 1 — Label alignment (low risk)
- Update nav labels and command palette taxonomy.
- Keep current routes, add aliases and cross-links.

### Phase 2 — Route family introduction (medium risk)
- Launch `/decide`, `/plan`, `/learn`, `/method` with reused modules.
- Backfill breadcrumb and "next step" links across pages.

### Phase 3 — Canonicalization (higher risk)
- Set canonical URLs and begin redirecting duplicated legacy entry points.
- Trim duplicated hubs once traffic and engagement are stable.

## Success metrics

- Lower bounce and faster first action from Command Center.
- Increased Decide → Plan pathway completion.
- Fewer backtracks between docs/reference and action pages.
- Higher methodology open rate from decision pages (trust validation behavior).

## Open decisions

1. Keep `Method` as top-level permanently or demote to utility nav after familiarity grows?
2. Should `Learn` launch with role-based landing slices (PM/Eng/Exec) or remain unified first?
3. Which legacy route family should be canonicalized last to preserve SEO equity?
