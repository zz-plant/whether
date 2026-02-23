---
name: executive-brief-pack
description: Build or QA Whether executive briefing outputs (strategy brief, export brief, CXO narrative) when users need share-ready, citation-backed leadership communication.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Executive brief pack (Whether)

## Use this skill when

- Asked to create/QA an executive brief from current regime signals.
- Preparing slide/email/Slack-ready summary content for leadership review.
- Verifying brief outputs are concise, actionable, and source-grounded.

## Inputs expected

- Audience (board, C-suite, product+engineering leads).
- Delivery format (memo, slide bullets, Slack/email).
- Time horizon (now, 30 days, next quarter).

## Workflow

1. Gather current regime and supporting signal evidence.
2. Select the minimum narrative needed: posture, reasons, actions, risks.
3. Build format-specific output (memo vs bullets) without changing underlying claims.
4. Attach source references and freshness notes.
5. Run a clarity pass: one headline + one support sentence per section before details.

## Output contract

Return in this order:

1. **Executive headline**
2. **Posture + rationale** (concise)
3. **Actions by function** (Product, Engineering, Finance)
4. **Risk watchlist + triggers**
5. **Citations and freshness notes**
6. **Optional format variants** (slide bullets / Slack version)

## Guardrails

- Keep statements auditable to current repo evidence.
- Avoid jargon-heavy prose; optimize for decision speed.
- Do not hide uncertainty—state confidence and trigger conditions.
- Preserve semantic equivalence across format variants.

## Non-goals

- Generating investor/legal advice.
- Creating fictional data to fill missing evidence.
- Producing broad market commentary with no operational implications.

## Maintenance notes

- Last reviewed: 2026-02-23
- Internal anchors: `docs/feature-specs-current.md`, `docs/prd-next-level.md`.
