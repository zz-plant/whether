---
name: regime-briefing-operator
description: Produce a decision-ready Whether weekly/regime briefing from repo data and docs when users ask what changed, what to do now, and what risks to watch.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Regime briefing operator (Whether)

## Use this skill when

- Asked for a weekly operator brief or "what changed since last read" summary.
- Asked to translate macro regime signals into product/engineering actions.
- Preparing leadership-ready guidance from existing Whether artifacts.

## Inputs expected

- Time window/cadence (daily, weekly, monthly).
- Audience (CPO/CTO/CFO/COO).
- Optional constraints (hiring freeze, runway target, launch date).

## Workflow

1. Pull current regime/signal context from source-of-truth repo files.
2. Extract factual state first (scores, thresholds, detected changes, timestamps).
3. Map facts to actions using existing playbook/recommendation artifacts.
4. Add confidence and assumptions.
5. Flag unknowns and what would change the recommendation.

## Output contract

Return in this order:

1. **Regime snapshot** (regime, tightness score, risk appetite score, timestamp)
2. **What changed** (3-6 bullets)
3. **Recommended actions now**
   - `start`, `stop`, `fence` moves
   - owner + time horizon for each
4. **Decision risks** (top 3)
5. **Assumptions + confidence**
6. **Unknowns / next data needed**

## Guardrails

- Separate extracted facts from interpretation.
- Prefer canonical repo data/docs over inferred values.
- If data freshness is unclear, state that explicitly.
- Keep language executive and action-first.

## Non-goals

- Forecasting unsupported macro outcomes.
- Inventing metrics not present in repo sources.
- Producing long narrative when a concise decision brief is requested.

## Maintenance notes

- Last reviewed: 2026-02-23
- Primary internal references: `docs/feature-specs-current.md`, `data/recommendations.ts`, report section components.
