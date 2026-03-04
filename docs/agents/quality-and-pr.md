# Testing & PR hygiene

## Validation depth expectations
Run the smallest meaningful verification set for the scope and risk of your change.

| Change profile | Minimum validation |
| --- | --- |
| Docs/copy-only | Verify links, commands, and references manually |
| Typical product/logic change | `bun run lint` + `bun run test` |
| Broad/refactor/high-risk logic change | `bun run check` + targeted regression coverage |

Additional requirements:
- Add/update tests when changing scoring, classification, or decision behavior.
- Validate deterministic fallback behavior for data-path changes.
- Capture command outcomes in your PR summary.
- `bun run review:hotspot-preflight` now runs inside `bun run check` and should be run early while developing logic changes.

## Commit quality
- Keep commits coherent, reviewable, and intentionally scoped.
- Use descriptive commit subjects that communicate impact and intent.

## PR quality bar
PR summaries should clearly state:
1. What changed.
2. Why it matters.
3. How it was validated (commands + outcomes).
4. Risks, limitations, and follow-up work.

Recommended PR section headings:
- **Summary**
- **Why this matters**
- **Validation**
- **Risks / follow-ups**

Automation notes:
- `.github/workflows/review-hotspot-preflight.yml` runs on push and pull requests to catch risky decision-logic edits without tests and newly added unsafe type assertions before review.
- `.github/workflows/pr-review-hotspot-checklist.yml` enforces that all required items in the PR template's **Review hotspot checklist** are explicitly checked before merge.

## Pre-merge quick checklist
- [ ] Scope is focused and aligned with the user request.
- [ ] Validation depth matches risk profile.
- [ ] Tests/docs updated where behavior/workflows changed.
- [ ] Known limitations and follow-ups are explicit.
