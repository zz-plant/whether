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
  <a href="#quickstart">Quickstart</a> ·
  <a href="docs/use-cases/operator-playbooks.md"><strong>Operator Playbooks</strong></a> ·
  <a href="#mcp--agent-integration">MCP &amp; Agent API</a> ·
  <a href="#what-is-new-here">What is new here</a> ·
  <a href="docs/README.md">Documentation</a>
</p>

<p align="center">
  <img src="docs/assets/whether-demo.gif" alt="Whether interactive weekly brief demo animation" width="760" style="border-radius: 8px; max-width: 100%;" />
</p>

---

## The Core Operating Loop

Whether turns public macro and capital-market data into **weekly operating guidance** for startup and product leaders:

$$\text{signals} \longrightarrow \text{posture} \longrightarrow \text{decisions} \longrightarrow \text{artifact}$$

Everything in this product is designed for **decision transmission** — enabling an operator to scan the brief, choose an operating posture, and share a meeting-ready artifact in **under 60 seconds**.

<p align="center">
  <img src="docs/assets/whether-dashboard.png" alt="Whether cockpit dashboard showing CPI, Fed Rate, VIX, and operating posture" width="760" style="border-radius: 8px; max-width: 100%;" />
</p>

---

## What is new here

The same two claims as [whether.work/about](https://whether.work/about), and neither is the data.

- **Lines decided before they are needed.** Hiring, spending, fundraising, the roadmap and new bets each get an action, a pause line and a resume line, written down before either is reached. The pause and resume lines sit apart, so one noisy week does not stop a decision and restart it.
- **A record that grades itself.** Every week's guidance stays published unedited, and the [track record](https://whether.work/history#track-record) scores the archive against what happened next, including where it falls short: changes in conditions that came with no warning, and a confidence figure that the [calibration study](https://whether.work/calibration) shows measures distance from a line, not probability.

The inputs are not new. Both scores start from public Treasury rates, by arithmetic short enough to check by hand ([`/trust#formula-reference`](https://whether.work/trust#formula-reference)). Inflation and unemployment are tracked but enter neither score.

### Where it fits, and where it does not

Through the Aug 2026 month-end, conditions changed 6 times in 176 months, and a month-end reading crossed one of the pause or resume lines in 22 of them (`lineCrossingMonths` in `lib/report/trackRecord.ts`; [whether.work/about](https://whether.work/about) prints the live count). Most Mondays, nothing has moved. So the use is to set the lines when a plan is made, and to hear the day one is crossed.

| Fits | Does not fit |
| :--- | :--- |
| Commitments that run for quarters and cost money to unwind: a hiring plan, a lease or multi-year contract, the runway to hold before the next raise | A single hire or purchase: the lines are a policy for a kind of decision, not a verdict on one |
| Plans a group approves once and should not re-argue each month: a budget whose second half is released when a line is crossed, or an agreed floor on runway | Under six months of runway: cash decides before markets do |
| Venture-backed U.S. companies with one to two years of runway, whose next raise depends on what capital costs | A company whose funding does not follow U.S. rates: outside the U.S., or in a sector raising on a boom of its own |
| Investors and accelerators sending one reading to every company they back: the portfolio note on `/share` says what the week means at each runway | Which product work matters most: rates bear on how much long-payback work a team can carry, not on what to build |

---

## How it works

### 1. The conditions and operating latitude

Instead of raw market charts or macroeconomic commentary, Whether reduces two scores, funding pressure and risk appetite, to one of four conditions:

- **Conditions**: Sunny / Cloudy / Stormy / Freezing, set by which side of 70 funding pressure sits and which side of 50 risk appetite sits.
- **Operating latitude (0–100)**: `0.7 × risk appetite + 0.3 × (100 − funding pressure)`, the room to hire, spend and commit; higher means more room. It is a summary of the two scores, not a separate reading.
  - **Higher latitude** $\rightarrow$ faster approvals, more experimentation, greater willingness to hire and expand fixed costs.
  - **Lower latitude** $\rightarrow$ shorter payback requirements, greater reversibility, tighter commitments.

```
+-----------------------------------------------------------------------------+
|  WEEK OF SEP 29, 2026 · FREEZING                OPERATING LATITUDE: 34/100  |
|  "Conditions are tightening. Freeze new commitments and protect runway."    |
+-----------------------------------------------------------------------------+
```

---

### 2. Bounded Decisions over Generic Advice

Generic advice says *"be cautious."* Whether delivers **bounded decisions**: an **Action**, the line that pauses it, and the line that resumes it. Three rows from the brief for the week of Sep 29, 2026:

| Area | Action now | Pause if | Resume when |
| :--- | :--- | :--- | :--- |
| **Hiring** | Limit hiring to backfills and mission-critical roles tied to delivery risk | Funding pressure &gt; 76 | Risk appetite &gt; 54 |
| **Spending** | Put a payback figure on every discretionary line before approving it | Funding pressure &gt; 76 | Funding pressure &lt; 66 |
| **Fundraising** | If you plan to raise, prepare the materials now so the timing stays yours | Risk appetite &lt; 44 | Risk appetite &gt; 54 |

The rules are calibrated on two axes of the reader's own company, chosen once and kept in the browser: **stage** (Seed, Series A, Series B+, Bootstrapped) and **cash runway** (under 6 months, 6–12, 12–24, 24+). Under a year of cash a cash gate leads every rule and the reversal is a cash milestone, not a macro read; past two years the pause and resume lines still bind but the brief offers the counter-cyclical move. The brief also states how far the market is from changing the conditions, in the market's own units — *"If the 1-month Treasury bill rate falls 0.15%, conditions turn Stormy"* — rather than in score points.

---

### 3. Meeting-Ready & Slack-Ready Artifacts

Decision clarity is incomplete without frictionless distribution. Every brief generates copy-ready, permalink-backed artifacts for Monday morning rituals:

<p align="center">
  <img src="docs/assets/whether-unfurl.png" alt="Whether Slack unfurl and rich share artifact preview" width="720" style="border-radius: 8px; max-width: 100%;" />
</p>

- **Slack Brief**: Markdown-ready summary formatted for executive and team channels (`whether brief slack`).
- **Board slide**: The week's call as a one-slide native PPTX (every box editable) or a one-page 16:9 PDF, downloaded from `/share` or `GET /api/export/board-slide?format=pptx|pdf`; the same slide is also an SVG for Figma or Keynote.
- **Investor update**: Two paragraphs for the market section of a monthly letter — the regime and its move since the prior month-end, then the call and what the company's runway band means for it.
- **Leadership Pack**: Bulleted recaps and role memos for board and leadership syncs.
- **Attributable Permalinks**: Every shared artifact links to a permanent, frozen citable record (`https://whether.work/brief/2026-w34`).
- **Between Mondays**: Subscribers who opt in are alerted the day a regime flips, a score crosses its line, or the short rate or the 10Y−2Y curve moves an emergency-sized amount between two reads — a quarter point on the rate, twenty basis points on the curve.

<p align="center">
  <img src="docs/assets/whether-email.png" alt="Whether email briefing view" width="600" style="border-radius: 8px; max-width: 100%;" />
</p>

---

### 4. Compact Trust & Data Provenance (`/trust`)

No black boxes. Every calculation is auditable in real-time with compact trust indicators:

- **Live Sensor Feeds**: Direct public series links to the Federal Reserve (FRED) and US Treasury (Yield Curve, CPI, Unemployment, BBB Spreads, Chicago FCI, VIX).
- **Formula Transparency**: Published math and hysteresis thresholds at [`/trust#formula-reference`](https://whether.work/trust#formula-reference).
- **Graceful Degradation**: Clear visual markers (`isLive`, `isFallback`) when upstream feeds degrade, ensuring offline safety and zero silent failures.

---

### 5. First-Class Agent & Developer Platform

Whether is designed from the ground up to be consumed by human operators and AI agents alike:

- **Native Model Context Protocol (MCP)**: Query the live brief directly within Cursor, Claude Desktop, Antigravity, or any MCP client via `https://whether.work/api/mcp`.
- **JSON API Endpoints**: Deterministic payloads for scripts, dashboards, and automated workflows.
- **Terminal CLI (`whether`)**: Full terminal workflow for engineers and operators.

```bash
# Query the live weekly operating brief
curl -s "https://whether.work/api/weekly" | jq '.summary'
```

---

## Visual Tour: Key Operator Surfaces

<p align="center">
  <em>The complete loop: from one-screen weekly briefs to operational checklists, verifiable trust, and historical track record.</em>
</p>

| Surface | Preview | Primary Job |
| :--- | :--- | :--- |
| **Weekly Brief** (`/`) | <img src="docs/assets/screens/weekly-brief-desktop.png" alt="Weekly Brief Desktop View" width="380" /> | This week's conditions, and an action, pause line and resume line for each area. |
| **Mobile Brief** (`/` on mobile) | <img src="docs/assets/screens/weekly-brief-mobile.png" alt="Weekly Brief Mobile View" width="200" /> | Responsive, high-compression mobile layout for quick scanning before Monday standups. |
| **Operations Hub** (`/operate`) | <img src="docs/assets/screens/operations-planning.png" alt="Operations Hub" width="380" /> | Role-based execution constraints, runway planners, and export generators. |
| **Trust & Provenance** (`/trust`) | <img src="docs/assets/screens/trust-provenance.png" alt="Trust and Provenance Board" width="380" /> | Live feed status, freshness SLAs, formula reference, and active warning monitors. |
| **Evidence Appendix** (`/signals`) | <img src="docs/assets/screens/evidence-sensors.png" alt="Evidence Appendix" width="380" /> | Deep sensor breakdown for Treasury yield curve, inflation, labor, and credit spreads. |
| **Track Record** (`/history`) | <img src="docs/assets/screens/track-record-history.png" alt="Track Record History" width="380" /> | Multi-year historical replay, regime transition diffs, and calibration audit logs. |

---

### 1) Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the local weekly brief.

### 2) Run from the CLI

```bash
# Read current status
bun run cli:whether -- status

# Generate Slack brief
bun run cli:whether -- brief slack

# Watch for regime changes
bun run cli:whether -- watch --changes-only
```

See [docs/cli-command-reference.md](docs/cli-command-reference.md) for all CLI commands.

### 3) Connect MCP (Model Context Protocol)

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

## Quickstart

### 1. Install & Run Locally

```bash
git clone https://github.com/zz-plant/whether.git
cd whether
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the live weekly operating brief with hot reloading.

### 2. Verification & Testing

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

## Documentation Links

- **[docs/use-cases/operator-playbooks.md](docs/use-cases/operator-playbooks.md)**: Role-specific operator workflows, playbooks & recipes
- **[docs/README.md](docs/README.md)**: Canonical documentation hub
- **[docs/editorial-guardrails.md](docs/editorial-guardrails.md)**: Vocabulary, decision contracts, and tone
- **[docs/one-screen-weekly-brief-spec.md](docs/one-screen-weekly-brief-spec.md)**: Core brief UI/UX specification
- **[docs/developer/quickstart.md](docs/developer/quickstart.md)**: Integration guide and API reference
- **[AGENTS.md](AGENTS.md)**: Guidelines for AI pair programming

---

## Where Whether sits

Whether is one of five systems that each hold a step of the loop an institution runs when it delegates consequential work to machines: believe, know what can be done, decide what authority is justified, act, detect mismatch, revise. Whether holds the **act** step. It turns changed conditions into weekly operating guidance; the operator acts. It authorizes nothing and takes no action itself.

- **Canonical export**: the decision memory ledger, in the [STD-07 Revisable Delegation Record](https://ethotechnics.org/standards/std-07-revisable-delegation-record) shape at `GET /api/decision-memory?format=records` (newline-delimited JSON, SHA-256 chained, oldest first). Every record is a `belief`: the regime read at the time, and the call that depended on it, with the assumption snapshot restated as the conditions that would invalidate it.
- **Conformance**: Level 2 (append-only, hashed, chained, and every record states what would end it), measured by the [record conformance checker](https://ethotechnics.org/diagnostics/record-conformance) rather than asserted here. Declared in [`/.well-known/whether-agent.json`](https://whether.work/.well-known/whether-agent.json) under `revisableDelegation`. It stops at Level 2 because no objection ever enters the stream, which a reader can see and this sentence cannot.
- **Wired to**: nothing yet. No sibling consumes these records and Whether consumes none. The manifest's `upstream` and `downstream` arrays are empty on purpose and fill in only when an edge exists in code.
- **Siblings**: [Ambit](https://github.com/zz-plant/ambit) (capability and authorization), [Refract](https://github.com/refract-org/refract) (discrepancy), [NextConsensus](https://nextconsensus.com) (belief), [Ethotechnics](https://ethotechnics.org) (the record shape and the vocabulary).

---

## Stance & Philosophy

- **Operating guidance, not financial advice**: Whether is built to pace organizational hiring, burn, and expansion — not pick stocks.
- **Delta first**: We emphasize what changed, what that flips in your decisions, and what would reverse the call.
- **Artifacts over dashboards**: The end state of an analysis is a shared decision in Slack or a meeting, not an unread portal.
