# Testing & PR hygiene

## Validation expectations
- Run the smallest meaningful verification set for the scope of change.
- Typical baseline for non-trivial changes: `bun run lint` + `bun test`.
- Prefer `bun run check` before shipping broad/refactor changes.
- Add/update tests when changing scoring, classification, or decision behavior.

## Commit quality
- Keep commits coherent and reviewable.
- Use descriptive commit subjects (what changed + intent).

## PR quality bar
PR summaries should clearly state:
1. What changed.
2. Why it matters.
3. How it was validated (commands + outcomes).
4. Any known risks, limitations, or follow-up work.
