# Whether — Regime Station

Whether translates macro market signals into a weekly operating posture for startups.

In practical terms, it gives founders a weekly answer for the decisions they obsess over: **hiring pace, fundraising timing, and runway discipline.**

## What Whether does
- Detects the current startup market weather from Treasury yield data and companion macro signals.
- Converts that weather read into concrete operating constraints (hiring posture, fundraising readiness, runway discipline).
- Provides decision support tools (Decision Shield, assumption locks, scenario previews, brief exports).
- Keeps outputs auditable with explicit source metadata and freshness timestamps.

## What Whether is not
- Not a macro crystal ball or future-prediction engine.
- Not a product strategy generator.
- Not a substitute for leadership judgment.

Whether is designed to reduce two common mistakes:
1. Operating like capital is easy when conditions are tightening.
2. Over-correcting into defensive mode when conditions are supportive.

## Who this is for
- Product and engineering leaders aligning roadmap and team velocity to market conditions.
- COO/CFO/strategy partners setting spend, runway, and risk posture.
- Planning and operations teams that need copy-ready, source-backed leadership summaries.

## How a product manager can use Whether to become more strategic
Whether does not replace product strategy, but it helps PMs build strategic habits with real market constraints in view.

### A practical PM-to-strategy workflow
1. **Start planning with climate context**
   - Read the current market climate before roadmap grooming or quarterly planning.
   - Convert signals into explicit constraints (risk tolerance, hiring pace, roadmap aggressiveness).
2. **Shift from features to portfolio posture**
   - Rebalance roadmap mix (core reliability, expansion bets, exploratory work) based on climate guidance.
   - Explain trade-offs with market-aware reasoning, not only internal capacity constraints.
3. **Frame decisions at executive altitude**
   - Pressure-test major product bets against downside scenarios.
   - Use assumption locks and scenario previews to show decision quality, not just confidence.
4. **Create repeatable strategy narratives**
   - Use brief exports to communicate why priorities changed and what signals support the shift.
   - Track recommendations across climate regimes to demonstrate strategic maturity over time.

The progression is: **macro awareness → operating posture → portfolio choices → evidence-backed narrative**.

### Promotion pathways this can support
- **Senior Product Manager:** Lead sharper prioritization and clearer cross-functional trade-offs.
- **Group Product Manager / Lead PM:** Balance multiple teams and bets with a coherent risk posture.
- **Director of Product:** Set market-aware planning cadence, investment pacing, and executive framing.
- **Head of Product / VP Product:** Align product narrative with CEO, board, and finance expectations.
- **Product Strategy / Chief of Staff:** Translate external signals into company-level planning guidance.


## Competitive positioning snapshot
- **Category:** weekly operating posture brief for startup leadership teams.
- **Primary alternatives:** macro terminals/research products, FP&A planning suites, BI dashboards, and manual chief-of-staff briefing workflows.
- **Differentiation:** Whether is optimized for decision transmission—signals to bounded operating call to shareable artifact in one weekly ritual.

For internal battlecards, objection handling, and segment talk tracks, see `docs/sales-competitive-messaging.md`.

## CLI install quickstart (canonical)
Use this when you want the `whether` command available with a stable non-interactive setup contract.

### Canonical method (recommended)
Install dependencies and run the installer in non-interactive mode:

```bash
bun install
bun run cli:whether -- install --yes --api-base-url http://localhost:3000
```

Linux/macOS CI-safe variant:

```bash
bun run cli:whether -- install --ci --api-base-url "$WHETHER_API_URL" --token "$WHETHER_API_KEY"
```

### Fallback method (restricted shells)
If your shell blocks writing `~/.config/whether/config.yaml`, skip install and use environment variables directly:

```bash
export WHETHER_API_URL="http://localhost:3000"
export WHETHER_API_KEY="<token-if-required>"
# Legacy alias still supported:
# export WHETHER_TOKEN="<token-if-required>"
```

Then run commands with `bun run cli:whether -- <command>` so config-file writes are not required.

### Agent/CI auth bootstrap
Use env-based auth (no config write required):

```bash
export WHETHER_API_URL="https://api.whether.app"
export WHETHER_API_KEY="<your-api-key>"

# Machine-readable preflight
bun run cli:whether -- auth status --json

# Optional: validate key against auth-protected API endpoint
bun run cli:whether -- auth status --check --json
```

The CLI also accepts `WHETHER_TOKEN` as a legacy alias, but `WHETHER_API_KEY` is preferred for automation.

### Verification
Run:

```bash
bun run cli:whether -- --version
```

Expected success behavior: exit code `0` and stdout contains only a semantic version string like `0.1.0`.

## Local development
1. Use Node.js 20+ (`.nvmrc`) and Bun 1.3.x.
2. Install dependencies: `bun install`
3. Start development server: `bun run dev` (or `bun run dev:turbo`)
4. Open `http://localhost:3000`

## Quality gates
- Full pre-PR check: `bun run check`
- Lint only: `bun run lint`
- Typecheck only: `bun run typecheck`
- Tests only: `bun run test`
- Clean generated build/dependency artifacts: `bun run clean`

## Time Machine summary refresh
- Refresh weekly/monthly/quarterly/yearly Time Machine summary archives from 2024 onward:
  - `bun run time-machine:update-summaries`
- Override the range when needed:
  - `bun run time-machine:update-summaries -- --start-year 2024 --end-year 2025`
- Preview commands without mutating files:
  - `bun run time-machine:update-summaries -- --dry-run`

This command runs all summary generators with `HISTORY_START_YEAR` (and optional
`HISTORY_END_YEAR`) so only the selected years are merged into `data/summary_archive.json`
instead of regenerating the full historical dataset.

## Project map (high signal)
- `app/` — Next.js App Router pages and UI features.
- `lib/` — Market-climate logic, data clients, thresholds, and shared utilities.
- `data/` — Snapshot/cache artifacts used for deterministic and offline-safe behavior.
- `tests/` — Node test suites for engine logic and decision rules.
- `scripts/` — Build and data-maintenance scripts.
- `docs/` — Architecture, roadmap, specs, and contributor/agent guidance.

## Contributor entry points
- Human contributors: `CONTRIBUTING.md`
- Engineering workflow deep-dive: `docs/development-playbook.md`
- Developer integration docs: `docs/developer/README.md`
- Agent contributors: `AGENTS.md` and `docs/agents/`
- Documentation index: `docs/README.md`
- Domain launch guidance: `docs/domain-and-deployment.md`
- Security reporting policy: `SECURITY.md`
- Community standards: `CODE_OF_CONDUCT.md`
- License: `LICENSE`

## Product and architecture references
- Architecture: `docs/architecture.md`
- Current feature scope: `docs/feature-specs-current.md`
- Next-level direction: `docs/prd-next-level.md`, `docs/specs-next-level.md`
- Stack modernization status: `docs/stack-modernization-*.md`

## Notes
- Whether provides operational strategy guidance, not investment advice.
- Keep data provenance explicit in code and UI outputs when extending data sources.
