---
description: Run full QA suite and summarize results
---

# QA Workflow

1. Run lint + typecheck + test:

   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```

2. Run Cloudflare-compatible build:

   ```bash
   bun run build:cloudflare
   ```

3. If any gate fails: fix root cause, re-run. Do NOT chain fix-attempt commits.
