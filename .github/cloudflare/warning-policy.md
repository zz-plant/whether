# Cloudflare warning policy

This repository keeps Cloudflare/Next-on-Pages build logs actionable by classifying warnings into one of two buckets:

1. **Expected warning classes** in `warning-baseline.txt` (audited by `scripts/cloudflare-warning-audit.mjs`).
2. **Known third-party noisy diagnostics** that are suppressed from console output but explicitly tracked here.

## Suppressed warning classes

### `duplicate-object-key` (`Duplicate key "options" in object literal`)

- **Observed in:** `next-on-pages` Cloudflare worker bundling output (`<stdin>` diagnostic).
- **Origin:** transpiled/minified third-party middleware composition (floating-ui style `arrow` + `transformOrigin` block), not first-party source literals.
- **Action taken:** suppress this warning class in `scripts/build.mjs` so CI logs stay signal-rich, while preserving all other warnings.
- **Tracking rule:** if message text or diagnostic shape changes, update this policy and the suppression pattern in the same PR.

## Guardrails

- Do **not** add broad wildcard suppressions.
- Every suppression must include: origin, rationale, and an explicit update rule.
- New warning classes still fail CI when `--fail-on-new` is enabled in warning audit jobs.
