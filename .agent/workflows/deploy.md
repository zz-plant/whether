---
description: Deploy to Cloudflare Workers
---

# Deploy Workflow

1. Run full checks:

   ```bash
   bun run lint && bun run typecheck && bun run test
   ```

2. Build for Cloudflare:

   ```bash
   bun run build:cloudflare
   ```

3. Deploy:

   ```bash
   bun run deploy
   ```
