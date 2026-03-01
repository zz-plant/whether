# whether.work front-end critique from a target persona viewpoint (2026-03-01)

## Target persona
**Name:** Maya Patel (archetype)  
**Role:** VP Product at a 120-person B2B SaaS company  
**Context:** Owns quarterly roadmap trade-offs with engineering, GTM, and finance pressure.  
**Time budget:** 5–10 minutes per visit.  
**Primary goal on whether.work:** Turn macro uncertainty into this week’s product and engineering operating decisions.

## Persona success criteria
Maya considers the experience successful if she can quickly answer:
1. **What changed this week?**
2. **What should we do differently now?**
3. **How confident should I be in this recommendation?**
4. **What can I send to my leadership team today?**

## Constructive front-end critique

### What works well for this persona
- **Strong top-level promise and audience fit.** The homepage framing (“how should your company operate right now?”) is aligned with executive decision urgency.
- **Decision-oriented IA appears in navigation and destination pages.** The site structure (signals, methodology, operations/briefings) gives Maya confidence there is both recommendation and rationale.
- **Trust surfaces exist.** Methodology + signal threshold content supports a “show your work” mental model, which is important for leadership communication.

### Friction points (persona-specific)
1. **Action clarity arrives too late for a time-constrained VP.**
   - Early pages can feel content-rich before they feel action-conclusive.
   - Maya may leave with context but without a committed “this week we will X” decision.

2. **The confidence narrative is fragmented across routes.**
   - Trust is present, but distributed (signals, methodology, evidence-like paths), requiring manual synthesis.
   - This increases cognitive load when Maya needs to defend decisions in cross-functional meetings.

3. **Route transitions can break mental momentum.**
   - Legacy/redirect paths (for planning/evidence intent) can make the product feel less intentional at critical moments.
   - For a senior operator, this can read as “prototype seams” rather than “operational system.”

4. **Operator vs analyst modes are not always clearly separated.**
   - Some pages are great for deep validation, but Maya’s first-pass need is concise execution guidance.
   - Without a clear mode switch, quick-scan users can end up in heavy explanatory content before they get the concise action lane.

5. **Artifact handoff for leadership communication could be tighter.**
   - Briefing-style destinations are valuable, but the path from “decision made” to “shareable artifact sent” can be more explicit.

## Recommended UX improvements (prioritized)

### P0 — Add an explicit “This Week’s Decision Card” above the fold
- Include: regime status, 3 priority actions, one “do-not-do” guardrail, confidence level, timestamp.
- Add two primary CTAs: **Run weekly operating sequence** and **Generate leadership brief**.
- Why for Maya: collapses analysis-to-action time into <60 seconds.

### P0 — Create a compact “Why this is credible” trust module near the decision card
- 3 bullets max: data inputs, rule logic, update cadence.
- Link out to full methodology/signals for deeper review.
- Why for Maya: gives immediate confidence without forcing deep reading first.

### P1 — Introduce persona mode toggles: “Operator view” vs “Analyst view”
- Operator view: summary, actions, risks, briefing CTA.
- Analyst view: thresholds, source details, methodology depth.
- Why for Maya: preserves depth while respecting executive scan behavior.

### P1 — Replace abrupt legacy redirects with intent-preserving bridge pages
- For plan/evidence-intent routes, show a short explanation + next-best CTA options.
- Why for Maya: maintains context and perceived product maturity.

### P2 — Strengthen microcopy for commitment and next step ownership
- Use explicit language like: “By Friday, leadership should decide…”
- Add team-owner labels (Product, Eng, GTM, Finance) on action items.
- Why for Maya: easier delegation and accountability in staff meetings.

## Lightweight success metrics to validate improvements
- **Time to first clear action** (landing → first action CTA click).
- **Decision-to-brief conversion** (users who view weekly decision content and generate/open a briefing artifact).
- **Trust engagement rate** (expands/clicks on credibility module without increased bounce).
- **Return usage cadence** (weekly revisit rate by signed-in or cookie-cohort users).

## Suggested 2-week experiment plan
1. Ship decision card + trust module on home and operations entry.
2. A/B test current hero vs decision-first hero for new visitors.
3. Measure CTA click-through, scroll depth, and revisit within 7 days.
4. Conduct 5 moderated sessions with VP Product / VP Engineering profiles to validate language clarity and decision confidence.

## Bottom line
From the target persona perspective, whether.work already has strong strategic ingredients (decision intent, trust assets, operational framing). The biggest front-end opportunity is **sequence optimization**: put decisive weekly guidance and compact credibility cues first, then let deeper analysis follow on demand.
