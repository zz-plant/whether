---
name: executive-brief-pack
description: Build or QA share-ready, citation-backed executive briefing outputs from current Whether signals with explicit actions, risks, and trigger conditions.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Executive brief pack (Whether)

## Use this skill when

- Creating/QAing executive brief outputs from current signals.
- Preparing memo/slide/Slack-ready leadership communication.
- Verifying a brief is concise, actionable, and source-grounded.

## Do not use this skill when

- The task asks for full methodology exposition over decision transmission.
- Evidence for core claims is unavailable.

## Workflow

1. Gather posture, signal evidence, and freshness markers.
2. Compress to minimum narrative: call, reasons, actions, risks.
3. Produce format-specific variants without changing core claims.
4. Attach citations and confidence/freshness notes.
5. Run a clarity pass for fast executive consumption.

## Output contract (required order)

1. **Skill used + why**
2. **Executive headline**
3. **Posture + rationale** (concise)
4. **Actions by function** (Product, Engineering, Finance)
5. **Risk watchlist + triggers**
6. **Citations and freshness notes**
7. **Optional format variants** (slide bullets / Slack version)
8. **Fallback note** (only if evidence gaps reduce confidence)

## Quality checks before finalizing

- Every core claim is traceable to repo evidence.
- Actions are bounded (owner, threshold, or trigger where possible).
- Format variants preserve semantic equivalence.
- Uncertainty is explicit (confidence + reversal trigger).

## Guardrails

- Avoid jargon-heavy prose; optimize for decision speed.
- Do not fabricate evidence to fill gaps.

## Maintenance

- Last reviewed: 2026-03-06
- Internal anchors: `docs/feature-specs-current.md`, `docs/prd-next-level.md`.
