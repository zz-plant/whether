# Testing & PR hygiene

## Validation depth expectations
Run the smallest meaningful verification set for the scope and risk of your change.

| Change profile | Minimum validation |
| --- | --- |
| Docs/copy-only | Verify links, commands, and references manually |
| Typical product/logic change | `bun run lint` + `bun test` |
| Broad/refactor/high-risk logic change | `bun run check` + targeted regression coverage |

Additional requirements:
- Add/update tests when changing scoring, classification, or decision behavior.
- Validate deterministic fallback behavior for data-path changes.
- Capture command outcomes in your PR summary.

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

## Pre-merge quick checklist
- [ ] Scope is focused and aligned with the user request.
- [ ] Validation depth matches risk profile.
- [ ] Tests/docs updated where behavior/workflows changed.
- [ ] Known limitations and follow-ups are explicit.
