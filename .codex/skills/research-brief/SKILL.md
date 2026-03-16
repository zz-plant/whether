---
name: research-brief
description: Produce a source-grounded research brief for macro, product, or engineering questions with explicit confidence, staleness notes, and decision-oriented implications.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Research brief

Answer a decision-relevant question with compact evidence, explicit confidence, and clear implications for Whether.

## Use this skill when

- a task asks for external research synthesis
- a decision needs evidence from external docs, websites, or primary sources
- the user explicitly asks for citations, freshness, or confidence

## Do not use this skill when

- the task is purely local implementation with no external dependency
- the request is open-ended opinion brainstorming without an evidence requirement
- the repo already contains the needed canonical answer and no external validation is required

## Required inputs

- the question being answered
- the decision owner or audience
- the time-sensitivity of the answer

## Repo anchors

- `AGENTS.md`
- `docs/agents/documentation.md`
- `docs/agents/data-and-platform.md`
- `docs/README.md`

## Workflow

1. State the question and decision owner in one sentence.
2. Gather primary sources first and add secondary sources only when needed.
3. Extract verifiable facts before interpretation.
4. Separate evidence from implications for Whether.
5. End with bounded next actions and unresolved unknowns.

## Output contract

Return in this order:

1. **Skill used + why**
2. **Question and decision owner**
3. **Executive summary**
4. **Evidence table**
5. **Implications for Whether**
6. **Recommended next actions**
7. **Open questions or unknowns**
8. **Fallback note** only if source or tool limits blocked the brief

## Quality checks before finalizing

- Each major claim is backed by at least one cited source.
- Primary sources are preferred and labeled clearly.
- Conflicts between sources are surfaced explicitly.
- Staleness risk is named for fast-moving topics.
- Recommendations are action-oriented, not generic commentary.

## Guardrails

- Do not present speculation as fact.
- Keep the brief compact and decision-first.
- If freshness materially affects correctness, say so directly.

## Maintenance notes

- Last reviewed: 2026-03-16
- Refresh when repo research standards or citation requirements change.
