---
name: research-brief
description: Produce a source-grounded research brief for macro/product/engineering questions with explicit confidence and staleness notes.
allowed-tools:
  - Read
  - Grep
  - WebFetch
---

# Research brief skill (Whether)

Use this skill when a task asks for external research, trend synthesis, or recommendations based on web/document sources.

## Objectives

1. Gather findings from high-quality primary sources.
2. Separate factual extraction from interpretation.
3. Produce an actionable brief for Whether contributors.

## Workflow

1. Clarify scope in one sentence (question + audience + decision owner).
2. Collect 3–8 sources, prioritizing official docs/specs/repos over commentary.
3. Extract facts first (quotes, metrics, dates, capabilities).
4. Add interpretation only after evidence is captured.
5. Summarize implications and open questions.

## Output contract

Return sections in this order:

1. **Question**
2. **Executive summary** (3–6 bullets)
3. **Evidence table** with columns:
   - Claim
   - Source URL
   - Retrieved date
   - Confidence (`high`/`medium`/`low`)
   - Staleness risk (`low`/`medium`/`high`)
4. **Implications for Whether**
5. **Recommended next actions**
6. **Open questions / unknowns**

## Quality guardrails

- Prefer primary sources. If using secondary analysis, label it explicitly.
- Avoid presenting speculation as fact.
- When docs are rapidly changing, mention likely drift points.
- If evidence conflicts, present both sides and explain uncertainty.
