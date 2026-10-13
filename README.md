# Whether

<p align="center">
  <img src="docs/assets/whether-badge.png" alt="Whether Badge" width="120" />
</p>

<h3 align="center">Weekly operating guidance for startup leaders</h3>

<p align="center">
  The interest-rate and credit lines that pause or resume your hiring, spend and raise. Checked every Monday, with an email the day one is crossed.
</p>

<p align="center">
  <a href="https://whether.work"><strong>Explore Live Brief</strong></a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="docs/use-cases/operator-playbooks.md"><strong>Operator Playbooks</strong></a> ·
  <a href="#3-connect-via-mcp">MCP &amp; Agent API</a> ·
  <a href="docs/README.md">Documentation</a>
</p>

<p align="center">
  <img src="docs/assets/whether-demo.gif" alt="Whether interactive weekly brief demo animation" width="760" style="border-radius: 8px; max-width: 100%;" />
</p>

---

## Quick Start

### 1. Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the local weekly brief.

### 2. Run from the CLI

```bash
# Read current status
bun run cli:whether -- status

# Generate Slack brief
bun run cli:whether -- brief slack

# Watch for regime changes
bun run cli:whether -- watch --changes-only
```

See [docs/cli-command-reference.md](docs/cli-command-reference.md) for full CLI commands.

### 3. Connect via MCP

Add Whether to your MCP client configuration:

```json
{
  "mcpServers": {
    "whether": {
      "url": "https://whether.work/api/mcp"
    }
  }
}
```

Or run locally over stdio:

```bash
bun run mcp:whether
```

---

## Operating Model

Whether converts public macroeconomic and capital-market feeds (Treasury yields, credit spreads, inflation, labor) into concrete weekly operating guidance:

- **Conditions & Latitude (0–100):** Conditions (`Sunny`, `Cloudy`, `Stormy`, `Freezing`) track funding pressure and risk appetite. Operating latitude balances risk appetite with funding relief (`0.7 × risk appetite + 0.3 × (100 − funding pressure)`).
- **Bounded Decisions:** Replaces generic advice with explicit operational thresholds — an **Action now**, the line that pauses it, and the line that resumes it.
- **Meeting-Ready Artifacts:** Every brief generates copy-ready permalinks, Slack briefs (`whether brief slack`), board slides (PPTX/PDF), and monthly investor updates.

| Area | Action now | Pause if | Resume when |
| :--- | :--- | :--- | :--- |
| **Hiring** | Limit hiring to backfills and mission-critical delivery roles | Funding pressure &gt; 76 | Risk appetite &gt; 54 |
| **Spending** | Enforce payback timeline on all discretionary commitments | Funding pressure &gt; 76 | Funding pressure &lt; 66 |
| **Fundraising** | Prepare materials in advance to retain timing control | Risk appetite &lt; 44 | Risk appetite &gt; 54 |

---

## Key Operator Surfaces

| Surface | Path | Primary Job |
| :--- | :--- | :--- |
| **Weekly Brief** | `/` | This week's conditions, and an action, pause line and resume line for each area. |
| **Operations Hub** | `/operate` | Role-based execution constraints, runway planners, and export generators. |
| **Trust & Provenance** | `/trust` | Live feed status, freshness SLAs, formula reference, and active warning monitors. |
| **Evidence Appendix** | `/signals` | Deep sensor breakdown for Treasury yield curve, inflation, labor, and credit spreads. |
| **Track Record** | `/history` | Historical archive, regime transition diffs, and calibration audit logs. |

---

## Development & Testing

| Task | Command | Description |
| :--- | :--- | :--- |
| **Dev Server** | `bun run dev` | Starts local dev server with hot reload |
| **Lint** | `bun run lint` | Runs ESLint across all app and lib files |
| **Typecheck** | `bun run typecheck` | Validates TypeScript contracts |
| **Targeted Test** | `bun test tests/homeBriefModel.test.ts` | Runs single test file (~0.2s) |
| **Full Test Suite** | `bun run test` | Runs entire regression suite |
| **Build** | `bun run build` | Builds production Worker bundle via Vinext |
| **Full Gate** | `bun run check` | Runs lint, typecheck, tests, and assets |

---

## Architecture & Codebase Map

```
whether/
├── app/                  # Next.js / Vinext routes and UI surfaces
│   ├── page.tsx          # Homepage: The one-screen Weekly Brief
│   ├── operate/          # Operations hub, scenario planning & action checklists
│   ├── signals/          # Evidence appendix & sensor breakdown
│   ├── trust/            # Data provenance, freshness SLAs & formulas
│   └── api/              # JSON API routes, MCP server & webhook handlers
├── lib/
│   ├── report/           # Brief data assembly, operating latitude, and knobs
│   ├── regimeEngine.ts   # Core macro scoring & regime classification
│   ├── macroSnapshot.ts  # Live FRED / Treasury feed ingestion & fallback
│   ├── export/           # Slack, email, slide (SVG/PPTX/PDF) and investor-update artifacts
│   ├── alert/            # Regime-change, threshold and flash alerts; email and Slack delivery
│   └── navigation/       # Information architecture & routing definitions
└── docs/                 # Product specs, editorial guardrails & agent guides
```

---

## Position in the Revisable Delegation Loop

Whether holds the **act** step in the [STD-07 Revisable Delegation Record](https://ethotechnics.org/standards/std-07-revisable-delegation-record) loop. It turns changed conditions into weekly operating guidance; the operator acts. It authorizes nothing and takes no action itself.

- **Canonical export**: Decision memory ledger in STD-07 shape at `GET /api/decision-memory?format=records` (newline-delimited JSON, SHA-256 chained, oldest first).
- **Conformance**: Level 2 (append-only, hashed, chained), declared in [`/.well-known/whether-agent.json`](https://whether.work/.well-known/whether-agent.json).
- **Siblings**: [Ambit](https://github.com/zz-plant/ambit) (capability and authorization), [Refract](https://github.com/refract-org/refract) (discrepancy), [NextConsensus](https://nextconsensus.com) (belief), [Ethotechnics](https://ethotechnics.org) (record shape and vocabulary).

---

## Documentation & Links

- **[docs/use-cases/operator-playbooks.md](docs/use-cases/operator-playbooks.md)**: Role-specific operator workflows, playbooks & recipes
- **[docs/README.md](docs/README.md)**: Canonical documentation hub
- **[docs/editorial-guardrails.md](docs/editorial-guardrails.md)**: Vocabulary, decision contracts, and tone
- **[docs/one-screen-weekly-brief-spec.md](docs/one-screen-weekly-brief-spec.md)**: Core brief UI/UX specification
- **[docs/developer/quickstart.md](docs/developer/quickstart.md)**: Integration guide and API reference
- **[AGENTS.md](AGENTS.md)**: Guidelines for AI pair programming
