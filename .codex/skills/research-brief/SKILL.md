---
name: research-brief
description: Produce a source-grounded research brief for macro/product/engineering questions with explicit confidence, staleness notes, and decision-oriented implications.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Research brief skill (Whether)

## Use this skill when

- A task asks for external research synthesis.
- A decision needs evidence from web/docs sources.
- A request explicitly asks for citations, confidence, or freshness.

## Do not use this skill when

- The task is purely implementation with no research dependency.
- The user asks for opinion-only brainstorming without evidence requirements.

## Workflow

1. State the decision question and audience in one sentence.
2. Gather 3–8 high-quality sources (primary docs/specs first).
3. Extract verifiable facts before interpretation.
4. Separate evidence from implications.
5. End with bounded recommendations and remaining unknowns.

## Output contract (required order)

1. **Skill used + why**
2. **Question + decision owner**
3. **Executive summary** (3–6 bullets)
4. **Evidence table**
   - Claim
   - Source URL
   - Retrieved date
   - Confidence (`high`/`medium`/`low`)
   - Staleness risk (`low`/`medium`/`high`)
5. **Implications for Whether**
6. **Recommended next actions**
7. **Open questions / unknowns**
8. **Fallback note** (only if blocked by source/tool limits)

## Quality checks before finalizing

- At least one primary source backs each major claim.
- Any secondary source is explicitly labeled as secondary.
- Conflicting evidence is surfaced, not smoothed over.
- Recommendations are action-oriented, not generic commentary.

## Guardrails

- Do not present speculation as fact.
- Include staleness/drift risk for fast-moving docs.
- Keep synthesis compact and decision-first.

## Maintenance

- Last reviewed: 2026-03-06
