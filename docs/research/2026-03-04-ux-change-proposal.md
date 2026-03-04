# UX change proposal (2026-03-04, reprioritized)

## Objective
Improve executive decision speed for the weekly planning flow while aligning with the existing roadmap, current implementation status, and already-shipped UX work.

## Repo-context constraints used for reprioritization
1. `docs/implementation-status.md` shows one remaining milestone UX item: **promote export/share actions directly into the Overview header**.
2. `docs/design-improvements-priority.md` marks multiple mobile/navigation improvements as implemented and identifies the **returning-visitor delta layer** as the primary pending design backlog item.
3. `docs/information-architecture-proposal.md` sets the canonical route model (`/start`, `/signals`, `/operations`, `/decide`, etc.), so proposals should reinforce this IA rather than introduce a competing structure.

## Reprioritized UX changes

### Now (P0): close already-identified gaps first

#### 1) Promote share/export actions into Overview header (ship-completion item)
- Move a single canonical action (`Copy weekly brief`) into the primary header region on `/start` and mirror equivalent action placement on `/operations`.
- Keep one action label pattern across surfaces to remove duplicate CTA phrasing.
- Include confidence + source metadata in copied output.

**Why now**
- This directly closes the only explicitly remaining UX item in the implementation tracker and improves action handoff in real meetings.

#### 2) Add returning-visitor delta strip to `/start`
- Add “Since last review” as the first block for returning users.
- Show only decision-relevant changes (posture movement, top driver shifts, risk trigger changes) with impact tags.
- Include jump links into relevant sections/routes.

**Why now**
- This is the top pending design backlog item and highest leverage for weekly repeat usage.

### Next (P1): reduce decision friction across the canonical path

#### 3) Reduce above-the-fold control density on Command Center
- Keep one directive posture card, one primary CTA, and one secondary CTA.
- Collapse tertiary controls behind “More actions.”
- Retain a compact trust strip (freshness + timestamp) in a single row.

**Why next**
- Improves first-30-second clarity but should follow completion of explicit open roadmap items.

#### 4) Progressive disclosure on Signals diagnostics
- Default to top drivers (3) with directional change and confidence.
- Gate full diagnostic depth behind “Show all diagnostics.”
- Persist expanded/collapsed state in URL query params for deterministic sharing/back behavior.

**Why next**
- Preserves analyst depth while reducing scan burden for leadership-first workflows.

### Later (P2): personalization and journey scaffolding

#### 5) Role-aware ordering on Operations/Decide
- Add role toggles (`Product`, `Engineering`, `Finance`, `Strategy`) that only reorder emphasis (no conflicting canonical guidance).
- Persist role state in URL for shareability.

**Why later**
- High value, but requires stronger recommendation-model governance and cross-role QA.

#### 6) Lightweight weekly-path rail across `/start → /signals → /operations → /decide`
- Add a compact progress indicator and one next-step CTA per route.
- Ensure Back button reverses state changes in strict sequence.

**Why later**
- Useful for wayfinding, but IA already defines routes and should not be reworked before closing higher-confidence actionability gaps.

## Updated success metrics (ordered by delivery phases)

### P0 metrics
- Header share/export usage on sessions reaching `/start` or `/operations`: **>45%**.
- Returning-user time-to-understand-change (landing to first delta interaction): **<10s median**.

### P1 metrics
- Time-to-first-action from `/start`: **<20s median**.
- Core flow completion (`/start` → `/signals` → `/operations`): **+20%**.

### P2 metrics
- Role toggle adoption on sessions reaching `/operations`/`/decide`: **>35%**.
- First-click correctness on primary route CTA: **>90%**.

## Sequencing recommendation
1. **P0 milestone closure + returning-user delta** (highest alignment with existing docs and current gaps).
2. **P1 density reduction + progressive diagnostics disclosure** (clarity and scan-speed gains).
3. **P2 role-aware ordering + route rail** (higher-complexity wayfinding/personalization layer).

## Risks / trade-offs
- Header CTA promotion can increase visual competition; mitigate via one-primary-CTA rule per region.
- Delta strip quality depends on robust change-detection logic; mitigate with explicit fallback message when no significant changes exist.
- Role-aware ordering may be interpreted as conflicting advice; mitigate by fixing canonical recommendation text and changing only ordering/emphasis.
