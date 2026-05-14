# Programmatic SEO operations runbook

This runbook codifies the repo-standard sequence for scaling SEO without weakening decision transmission:

1. Expand high-intent decision-answer coverage.
2. Score answer pages before launch with quality gates.
3. Generate fresh payload artifacts and refresh queue weekly.
4. Flag sustained low-conversion pages for merge/prune review.
5. Keep every secondary/programmatic page linked back to the Weekly Brief.

## Strategies most likely to succeed in this repo

Prioritize these in order. They are aligned to Whether's core loop (`signals -> posture -> decision -> artifact`) and current quality gates.

### 1) Build intent clusters around bounded operator decisions

Focus page generation on concrete operator questions that imply an action now, a trigger, and a reversal condition.

- Preferred page shape: **question -> current posture -> action this week -> what flips the call**.
- Preferred intents: budget tightening/loosening, hiring pace, pricing changes, GTM efficiency thresholds, runway guardrails.
- Avoid pages that only explain macro concepts without an operator action.

Why this works here:
- It matches existing answer-page semantics and avoids thin SEO pages.
- It reuses the same decision language operators already see in `/` and `/resolve`.

### 2) Reuse canonical evidence and trust metadata on every generated page

Ensure each programmatic page carries freshness, provenance, and degraded-state markers using the same data model as the weekly brief.

- Include capture timestamp and source continuity in the rendered page contract.
- Block indexing when freshness/provenance gates fail.
- Show compact trust signals inline (not long method copy).

Why this works here:
- Trust consistency improves conversion and lowers re-litigation risk in meetings.
- It reinforces existing guardrails in SEO payload generation and index eligibility.

### 3) Generate fewer pages, but with higher decision delta density

Prefer smaller, higher-intent clusters over wide long-tail expansion.

- Prioritize terms where users are making immediate operating decisions ("freeze hiring now?", "raise burn cap?", "cut CAC target?").
- Prune or merge pages with persistent low conversion or duplicate intent.
- Keep per-page copy compressed for screenshot/copy/share use.

Why this works here:
- It improves decision transmission and artifact quality.
- It reduces new-system overhead and content freshness risk.

### 4) Treat weekly refresh and stale-page suppression as revenue-critical

Operationalize a weekly runbook so stale decision pages do not stay indexed.

- Run artifact generation and refresh queue updates every week.
- Fail fast on stale payloads or missing trust contract fields.
- Add merge-or-prune reviews for pages that miss conversion thresholds across multiple cycles.

Why this works here:
- This product's value is time-sensitive; stale advice erodes trust quickly.
- Existing scripts already support this workflow.

### 5) Design internal links for decision progression, not content sprawl

Use link architecture that moves readers toward action and the canonical weekly artifact.

- Link from each answer page to:
  - the relevant weekly brief section,
  - the matching `/resolve` role view,
  - the operational guardrail page in `/planning` when applicable.
- Keep one clear next action CTA above the fold.
- Avoid unrelated "related articles" grids that diffuse operator intent.

Why this works here:
- It improves conversion from search landing -> decision artifact -> reusable meeting output.

### 6) Measure success with decision metrics, not only traffic metrics

Track outcomes that reflect operator action, not just impressions.

- Primary: brief click-through, copy/export actions, return cadence, and decision-page to weekly-brief transition rate.
- Secondary: qualified organic sessions and rank coverage.
- Guardrail: stale-page index share should trend toward zero.

Why this works here:
- A lower-traffic page that drives operating decisions is more valuable than a high-traffic explainer.

## 90-day implementation sequence

1. **Weeks 1-2:** map top operator-intent clusters to existing answer-page templates and identify thin/duplicate pages.
2. **Weeks 3-4:** tighten contracts (freshness/provenance/noindex reasons) and enforce launch-readiness failures.
3. **Weeks 5-8:** expand only high-intent clusters with bounded-rule copy and strict internal-link progression.
4. **Weeks 9-12:** prune/merge underperformers and rebalance generation toward conversion-positive clusters.

## Start-here backlog (highest-confidence opportunities)

Use this shortlist before creating any additional long-tail pages.

| Cluster | Example query intent | Recommended page/output contract | Primary CTA |
| --- | --- | --- | --- |
| Hiring pace | "Should we freeze hiring this quarter?" | Current posture + role-specific action + trigger + reversal condition + citation timestamp | Go to `/planning` hiring guardrails |
| Burn discipline | "How much should we cut burn now?" | Bounded burn action with threshold bands and explicit revisit date | Open weekly brief decision delta on `/` |
| GTM efficiency | "Should we prioritize efficiency over growth?" | Current efficiency/growth call + threshold that flips posture + what to pause | Go to `/resolve` role lens |
| Pricing posture | "Can we raise prices in this macro regime?" | Action now + customer risk trigger + rollback condition + source freshness | Copy/share weekly posture artifact |
| Runway planning | "How many months runway should we target now?" | Target runway band + assumptions + reversal trigger + source confidence | Open operator checklist in `/planning` |

Selection rule:
- Expand a cluster only when it can map to the bounded-decision contract above.
- If intent cannot produce an action + threshold + reversal condition, merge it into an existing page instead of launching new URLs.

## Review checklist for each new programmatic page

Ship only when all checks pass:

1. **Decision transmission:** operator can answer "what should I do this week?" in under 60 seconds.
2. **Bounded rule:** page contains action, trigger, and reversal condition.
3. **Trust compactness:** freshness/provenance/confidence/fallback are visible in-line or one click away.
4. **Artifact readiness:** page has screenshot-safe summary bullets and copyable decision text.
5. **Canonical progression:** page links to `/` and the relevant `/resolve` or `/planning` destination.
6. **No thin duplication:** page has distinct intent and does not restate nearby content without added decision value.

Failure policy:
- Any failed check should set `noindex` until resolved.
- Two consecutive low-conversion or low-distinctness reviews should trigger merge-or-prune.

## Commands

```bash
bun run seo:answers:launch-readiness
bun run seo:weekly-runbook
```

## Notes

- `seo:answers:launch-readiness` fails if any answer page cannot pass baseline completeness/trust/uniqueness checks.
- `seo:weekly-runbook` generates payload artifacts and the refresh queue/status artifacts in one command.
- Refresh queue records include `merge-or-prune-candidate` when high-intent pages underperform conversion targets for multiple evaluations.
