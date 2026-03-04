# Review comment patterns (GitHub: `zz-plant/whether`)

## Scope
- Source: pull-request review comments from `https://github.com/zz-plant/whether`.
- Snapshot method: `bun run review:comment-trends:update` (writes JSON + markdown artifacts).
- Sample size: 200 review comments.
- Note: this repository's recent review comments are predominantly from automated reviewers; use `--humans-only` if you want an explicit human-only cut.
- Automation: `.github/workflows/review-comment-trends.yml` runs weekly and on-demand to generate trend artifacts in CI.

## What comes up often
Top recurring themes in the sampled comments:

1. **Edge-case handling** (`40`)
   - Typical feedback: missing behavior for empty/missing upstream values and fallback-path ambiguities.
2. **Duplication / refactor opportunities** (`40`)
   - Typical feedback: repeated thresholds/constants or repeated transformation logic.
3. **Separation of concerns** (`40`)
   - Typical feedback: single components/functions taking on fetch + derive + render responsibilities.
4. **Readability / naming clarity** (`28`)
   - Typical feedback: abbreviations, magic numbers, or unclear variable naming reduce maintainability.
5. **Testing gaps** (`10`)
   - Typical feedback: behavior changes land without explicit regression tests for scoring/classification paths.
6. **Type-safety concerns** (`7`)
   - Typical feedback: unsafe assertions or weak runtime validation around external data shape assumptions.

## What to put in place to reduce/prevent this

### 1) Add a review-hotspot gate in the PR template
A required checklist was added to `.github/pull_request_template.md` so each PR author self-verifies:
- type-safety assumptions,
- edge-case behavior,
- separation of concerns,
- duplication,
- readability.

This moves common feedback to pre-review time.

### 2) Keep trend analysis script-driven and repeatable
`scripts/review-comment-trends.mjs` can be rerun at any time to spot drift in recurring comment categories (including or excluding bot comments).

### 3) Track a snapshot artifact for calibration
`docs/research/review-comment-trends.latest.json` and `docs/research/review-comment-trends.latest.md` capture the latest category distribution and a review-ready summary so the team can tune linting, tests, and guidance based on actual review pain.

## Suggested next guardrails
- Add targeted lint/custom checks for fragile type assertions and duplicated threshold logic.
- Require focused tests when classification/scoring logic changes.
- Apply a fetch/derive/render split pattern to oversized page components.
