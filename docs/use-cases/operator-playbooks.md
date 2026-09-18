# Operator Playbooks & Exemplary Use Cases

This guide documents practical, role-by-role workflows demonstrating how startup leaders, engineering teams, finance partners, and AI agents translate macroeconomic signals into bounded weekly actions.

---

## Overview: The 60-Second Operating Loop

Whether turns capital-market physics into a weekly operating posture:

$$\text{signals} \longrightarrow \text{posture} \longrightarrow \text{decisions} \longrightarrow \text{artifact}$$

Rather than debating abstract economic opinions, operators use bounded decisions (**Action**, **Threshold**, **Reversal Condition**) to pace hiring, spend, and risk.

---

## 1. Monday Leadership Sync (Founder, CEO & Chief of Staff)

### The Problem
Leadership teams frequently spend 20–30 minutes of their Monday morning meeting debating contradictory market vibes or arguing about macroeconomic news before aligning on weekly priorities.

### The Workflow
1. **At 8:45 AM Monday**, the Chief of Staff pulls the weekly brief:
   ```bash
   bun run cli:whether -- brief slack
   ```
   *(Or clicks **Copy Brief** from the top fold of [whether.work](https://whether.work))*
2. Pastes the snippet into `#leadership` on Slack.
3. The team uses the **Operating latitude** as their baseline agenda constraint:
   - **Score > 75 (Sunny / Expansion):** Fast-track hiring and expansion decisions.
   - **Score 50–74 (Guarded Expansion / Transitional):** Stage capital commitments; enforce 6-month payback limits.
   - **Score < 50 (Defensive / Scarcity):** Freeze fixed-cost commitments; review all pipeline assumptions.

### Concrete Exemplary Artifact
```markdown
🌤️ WHETHER WEEKLY BRIEF · Week 34 (2026-w34)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Regime: GUARDED EXPANSION (Sunny)
Operating latitude: 62 / 100
Call: Stage decisions. Avoid irreversible fixed-cost commitments.

OPERATING BOUNDARIES:
• DO NOW (Action): Fund initiatives with <6-month payback. Backfill revenue-critical roles only.
• PAUSE IF (Threshold): BBB credit spreads widen >220 bps or 10Y-2Y yield inversion deepens >15 bps.
• OPEN BACK UP WHEN (Reversal): Funding pressure watch line stays <60 for 2 consecutive refreshes.

PROVENANCE:
US Treasury (2026-08-28) · FRED Rates & Spreads · Confidence: HIGH
Permanent Citable Record: https://whether.work/brief/2026-w34
```

---

## 2. Engineering & Tech Debt Prioritization (VP Eng / CTO)

### The Problem
An engineering lead requests 3 months of team capacity for an infrastructure database refactor. In a zero-interest-rate environment, speculative platform investments are easily approved. In a tight capital regime, multi-quarter un-shipped rewrites can jeopardize company runway.

### The Workflow
1. VP of Engineering consults the **Decision Shield** rules for *Infrastructure / Architecture*:
   ```bash
   bun run cli:whether -- scenario --action rewrite --horizon 6m
   ```
2. Evaluates the cost of capital against the payback constraint.

### Exemplary Decision Contract
- **Current Posture:** *Guarded Expansion (Base Rate 5.25%, Curve Flat/Inverted)*
- **Decision Rule:**
  - **Action:** Split the database rewrite into 2-week independently releasable slices that deliver immediate compute cost reduction ($\ge 15\%$).
  - **Threshold / Guardrail:** If the rewrite cannot demonstrate measurable cost savings within 90 days, halt phase 2.
  - **Reversal Condition:** Greenlight long-term architectural migrations only when the Yield Curve steepens $\ge 50\text{ bps}$ and Fed rate cuts reduce capital scarcity.

---

## 3. Runway & Headcount Budgeting (CFO / VP Finance)

### The Problem
Finance needs objective, non-emotional criteria to determine when runway buffers must expand from 12 months to 18–24 months, and when open headcount requisitions must be held.

### The Workflow
1. Finance integrates Whether's expanded status into their monthly FP&A review:
   ```bash
   curl -s "https://whether.work/api/cli/status?view=expanded" | jq '.boundedDecision'
   ```
2. Compares the **Cash Availability / Tightness Index** and **BBB Credit Spreads** against internal burn targets.
3. Calibrates the brief to the company's cash position: pick a runway band on `/` (the hero's
   "Calibrate Runway" row, or `?runway=critical|tight|balanced|abundant`, or a month count such
   as `?runway=9`). Below twelve months the weekly call leads with a cash gate and its reversal
   is a cash milestone, not a macro read; above twenty-four it offers a counter-cyclical move at
   the same payback bar. The band is a cookie, never a cash figure, and stays in the browser.
4. For the monthly letter, copies **Investor update** on `/share`: two paragraphs — the regime
   and its move since the prior month-end, then the call and what the runway band means for it —
   with the source stamped underneath.
5. For the board pack, downloads the **Board slide** from `/share` as a native PPTX (editable) or
   a one-page PDF (`/api/export/board-slide?format=pptx|pdf&stage=series-a`).

### Exemplary FP&A Rule
- **Baseline Rule:** If **BBB Spreads $\ge 2.20\%$** or **Cash Availability Index $\le 45$**, capital markets are pricing significant credit distress.
- **Immediate Budget Adjustment:**
  1. Increase minimum forward cash buffer from 12 months to 18 months.
  2. Shift uncommitted variable marketing spend to high-intent conversion channels.
  3. Require CFO sign-off for any non-revenue headcount additions.

---

## 4. Autonomous Agent Sprint Refinement (AI / DevOps Lead)

### The Problem
Autonomous AI agents (such as Cursor, Claude Desktop, or Antigravity) running sprint ticket triage or PR reviews lack external macroeconomic context and may prioritize high-risk, speculative exploratory tickets over revenue-protective fixes.

### The Workflow
1. Configure Whether's native **Model Context Protocol (MCP)** server:
   ```json
   {
     "mcpServers": {
       "whether": {
         "url": "https://whether.work/api/mcp"
       }
     }
   }
   ```
2. The agent executes a pre-sprint triage tool call:
   ```typescript
   // Agent queries whether status
   const brief = await mcp.callTool("whether", "get_weekly_brief", { cadence: "weekly" });
   
   if (brief.boldnessBudget < 50) {
     // Tag speculative refactors with a hold label
     applyLabel("macro:requires-fast-payback");
   }
   ```

### Exemplary Agent Prompt Handoff
```json
{
  "cadence": "weekly",
  "regime": "GUARDED_EXPANSION",
  "boldnessScore": 62,
  "agentHandoff": {
    "prompt": "Evaluate new roadmap proposals with payback constraint: maximum 6 months. Maintain 18+ months forward runway. Do not approve unbounded infrastructure migrations.",
    "payload": {
      "decision_rules": {
        "engineering": "Stage architectural refactors into sub-month milestones.",
        "hiring": "Backfill revenue-generating engineering positions only."
      }
    }
  }
}
```

---

## 5. Board Pack Preparation & Quarterly Governance (Founder / Board Member)

### The Problem
During quarterly Board meetings, investors and directors may question past hiring or spending decisions with hindsight bias ("Why did we slow down hiring in Q2?").

### The Workflow
1. Export the immutable historical decision record:
   ```bash
   curl -s "https://whether.work/api/decision-memory?clientId=acme-corp&format=csv" > board-macro-audit.csv
   ```
2. Attach the permanent citable permalinks (`https://whether.work/brief/YYYY-wWW`) to the Board deck annex.

### Exemplary Board Slide Citation
> *"In Q2 2026, management paced hiring and preserved 21 months of runway in alignment with Whether's published Scarcity posture (Record Date: 2026-05-14, BBB spread 2.45%). This discipline protected cash without requiring dilutive bridge financing."*

---

## Summary Matrix

| Persona | Primary Ritual | Preferred Tool / Endpoint | Core Output |
| :--- | :--- | :--- | :--- |
| **Founder / CEO** | Monday Standup | `whether brief slack` | 60-second Slack Posture Call |
| **VP Engineering** | Sprint Planning & Debt Review | `whether scenario` / Decision Shield | Payback-Bounded Tech Debt Rules |
| **CFO / VP Finance** | Monthly FP&A Review | `GET /api/cli/status?view=expanded`, `/share` (investor update, board slide) | Runway-calibrated call; letter and board-pack artifacts |
| **AI Agents** | Automated Ticket Triage | MCP (`/api/mcp`) / `GET /api/agent` | Policy-Constrained Ticket Tagging |
| **Board / Directors** | Quarterly Governance | `GET /api/decision-memory` / `/history` | Auditable Capital Discipline Log |
