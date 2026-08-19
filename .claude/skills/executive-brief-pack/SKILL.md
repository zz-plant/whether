---
name: executive-brief-pack
description: Build or QA share-ready, citation-backed executive briefing outputs from current Whether signals with explicit actions, risks, and flip conditions.
allowed-tools:
  - Read
  - Grep
  - Bash
---

# Executive brief pack

Turn current Whether artifacts into leadership-ready outputs that can be scanned, shared, and defended quickly.

## Use this skill when

- creating an executive memo, slide outline, or Slack brief from current Whether signals
- QAing whether an existing leadership artifact is concise, bounded, and source-grounded
- translating the weekly call into function-specific leadership actions

## Do not use this skill when

- the task is methodology exposition
- evidence for core claims is missing or stale and cannot be checked
- the request is for deep product implementation guidance rather than leadership communication

## Required inputs

- the target audience and format
- the current posture or brief artifact being summarized
- freshness or provenance markers for the supporting claims

## Repo anchors

- `docs/one-screen-weekly-brief-spec.md`
- `docs/feature-specs-current.md`
- `docs/editorial-guardrails.md`
- `app/operations/components/`

## Workflow

1. Gather the current posture, supporting reasons, and freshness markers.
2. Identify the decision delta first: what changed and what leaders should revisit now.
3. Convert the call into bounded actions by function.
4. Add risk watch items and flip conditions.
5. Produce the requested format without changing the core meaning.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Executive headline**
3. **What changed**
4. **Posture and rationale**
5. **Actions by function**
6. **Risk watchlist and flip conditions**
7. **Citations and freshness notes**
8. **Optional format variant**
9. **Fallback note** only if evidence gaps materially reduce confidence

## Quality checks before finalizing

- The artifact leads with the decision delta, not explanation.
- Actions are bounded by owner, trigger, threshold, or horizon when possible.
- Core claims map to repo evidence.
- Shorter format variants preserve semantic equivalence.

## Guardrails

- Optimize for a one-minute executive read.
- Avoid methodology detours on the main path.
- Do not fabricate evidence or certainty.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when core brief semantics, trust markers, or executive export surfaces change.
