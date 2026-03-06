# PR merge patterns and workflow adjustments (sample: last 400 PRs)

## Scope and method
- Source: local merge history (`git log --merges --pretty=%s`).
- Sample window: PR `#683` back through `#248` (400 merged PRs parsed from merge subjects).
- Goal: identify recurring merge patterns that create avoidable follow-up work, then define low-overhead process adjustments.

## What repeatedly shows up

### 1) High follow-up fix churn
In the sampled window, `fix-*` appears as the first token in **70** PR branch names, suggesting substantial reactive cleanup after initial changes.

### 2) Review/audit/find loops are frequent
`review|audit|find|identify|analyze|evaluate|locate-*` appears in **75** PR branch names, indicating repeated diagnostic loops rather than one-pass delivery.

### 3) Build and release reliability keeps recurring
Build/deploy terms (`build`, `cloudflare`, `prerender`, `typescript`, `deployment`, `ci`) appear in **55** PR branch names.

### 4) Navigation/IA/route churn remains expensive
Navigation and route terms (`navigation`, `route`, `redirect`, `breadcrumb`, `ia`) appear in **46** PR branch names.

### 5) A meaningful share of work is surface/content tuning
Content/page/SEO terms appear in **50** PR branch names, often interleaved with platform quality fixes.

## Adjustments to make life easier (ranked by expected leverage)

### A) Add a required pre-merge command for common failure modes
Adopt a single required command in CI and local workflow (for product code PRs):
- `bun run lint`
- `bun run test` (targeted suites when possible)
- route/redirect smoke coverage
- build compatibility check relevant to deployment target

Why this matters: high-frequency “fix build / fix route / follow-up PR” work can be caught before merge.

### B) Require decision-delta framing in every product-facing PR
Add explicit PR fields for:
- what changed for operators,
- what decision should tighten/loosen,
- what to revisit,
- what would flip the call.

Why this matters: keeps changes anchored to the core product loop (`signals → posture → decision → artifact`) and reduces review ambiguity.

### C) Add hotspot ownership in review routing
For each PR, mark a primary hotspot (brief core, navigation/IA, build/deploy, trust/fallback, export).
Require one reviewer who owns that hotspot for the week.

Why this matters: reduces regressions in recurrent high-churn areas without adding heavy process.

### D) Batch low-risk copy/visual-only nits
When possible, batch small copy-only or cosmetic changes into scheduled maintenance PRs.

Why this matters: lowers merge queue noise and preserves reviewer bandwidth for decision-critical logic.

## Immediate implementation in this repo
- PR template updated with required **Decision delta** fields.
- PR template updated with required **Surface + owner** routing fields.

## Follow-up recommendation
- Add a short CI policy doc section that maps PR type → required checks.
- Add lightweight route/redirect smoke tests if not already present.
- Re-run this same merge-pattern check monthly and track trend direction.
