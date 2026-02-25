# Whether — Market Climate Station

Whether translates public macro signals into operational guidance for product and engineering leaders.

In practical terms, it helps leadership teams answer: **"Given today's funding and risk environment, how aggressively should we operate right now?"**

## What Whether does
- Detects the current market climate from Treasury yield data and companion macro signals.
- Converts that climate read into concrete operating constraints (pace, hiring posture, roadmap bias).
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

## Local development
1. Use Node.js 20+ (`.nvmrc`) and Bun 1.3.x.
2. Install dependencies: `bun install`
3. Start development server: `bun run dev` (or `bun run dev:turbo`)
4. Open `http://localhost:3000`

## Quality gates
- Full pre-PR check: `bun run check`
- Lint only: `bun run lint`
- Typecheck only: `bun run typecheck`
- Tests only: `bun test`

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
