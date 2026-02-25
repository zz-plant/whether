# /solutions and /solutions/career-paths enhancement opportunities

This note captures product and UX improvements for the solutions discovery surface and the dedicated career-path workflows.

## /solutions (hub-level) opportunities

1. **Add a dedicated `/solutions` landing hub**
   - Provide a clear index with cards for roadmapping, engineering capacity, market regime playbook, and career paths.
   - Why: today users can access individual pages, but there is no obvious “start here” parent route for solution discovery.

2. **Add role-intent entry points before deep navigation**
   - Prompt users to choose intent (e.g., plan roadmap, defend staffing, prepare exec update, grow in role) and route accordingly.
   - Why: intent-first navigation reduces cognitive load and improves first-session relevance.

3. **Show outcome-first previews per solution**
   - Add concise previews with “decision this helps with”, “inputs required”, and “output artifact generated”.
   - Why: clarifies value quickly and increases click confidence.

4. **Add trust surfaces and recency metadata**
   - Display latest signal refresh timestamp and confidence framing at the hub level.
   - Why: reinforces that all solution pages are grounded in current evidence quality.

5. **Introduce progression rails across solutions**
   - Add a recommended sequence (Understand climate → Plan trade-offs → Operationalize execution → Communicate outcomes).
   - Why: helps users combine pages into a repeatable operating workflow instead of isolated reads.

## /solutions/career-paths opportunities

6. **Add role filters and comparison view on the career index**
   - Allow filtering by seniority band, team scope, and functional emphasis; add side-by-side comparison for 2 roles.
   - Why: makes it faster to pick the right playbook and supports manager/IC calibration conversations.

7. **Add role diagnostics (“where am I now?”)**
   - Add a lightweight self-assessment that maps current behaviors to likely role path fit.
   - Why: users often know their problems, not their level labels; diagnosis improves pathway selection.

8. **Add 30/60/90-day execution plans per role**
   - Extend each role page with phased actions, expected artifacts, and stakeholder touchpoints.
   - Why: converts abstract growth goals into concrete near-term operating plans.

9. **Add evidence-backed promotion packet templates**
   - Provide downloadable or copyable templates with sections for decision quality, risk framing, and impact narratives.
   - Why: aligns the product with a high-frequency user job-to-be-done: promotion and scope expansion narratives.

10. **Add cross-role transition bridges**
    - For each role, include “if moving from X to Y” guidance and what judgment shifts are expected.
    - Why: transitions are high-anxiety points where targeted guidance has outsized practical value.

## Implementation notes

- Create `app/solutions/page.tsx` as the canonical hub route and link all solution templates from there.
- Reuse existing metadata + card styles from `app/guides/page.tsx` and existing solution pages to keep UI consistent.
- Extend `app/solutions/career-paths/roleLandingData.ts` with optional fields (`seniority`, `scopeType`, `transitionFrom`, `plan30_60_90`).
- Implement filters and compare interactions on `app/solutions/career-paths/page.tsx` before expanding individual role pages.
- Add role-page sections incrementally in `app/solutions/career-paths/[role]/page.tsx` to avoid broad refactors.

## Suggested priority tiers

### P0 (high urgency / highest near-term leverage)
- **1. Add a dedicated `/solutions` landing hub**
- **3. Show outcome-first previews per solution**
- **6. Add role filters and comparison view on the career index**

### P1 (important next wave after P0)
- **2. Add role-intent entry points before deep navigation**
- **4. Add trust surfaces and recency metadata**
- **8. Add 30/60/90-day execution plans per role**
- **9. Add evidence-backed promotion packet templates**

### P2 (valuable but can follow once core navigation + role fit are strong)
- **5. Introduce progression rails across solutions**
- **7. Add role diagnostics (“where am I now?”)**
- **10. Add cross-role transition bridges**
