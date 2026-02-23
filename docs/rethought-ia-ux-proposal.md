# Rethought IA + UX proposal (v2)

## Why this revision exists
The first proposal established a strong direction but stayed too conceptual.
This version is intentionally more execution-ready: explicit audiences, task flows,
route contracts, component specs, analytics events, and rollout gates.

---

## 1) Product intent (in one sentence)
Whether should feel like a **weekly operating system for leadership decisions**, not a macro dashboard.

## 2) Audience and jobs-to-be-done

### Primary users
1. **Product leader**
   - Needs: protect roadmap throughput, decide launch pacing.
   - Success: leaves with explicit product posture + owner assignments.
2. **Engineering leader**
   - Needs: rebalance reliability vs feature velocity under uncertainty.
   - Success: has a concrete execution plan by horizon.
3. **Founder/GM/finance partner**
   - Needs: understand risk and communicate posture quickly.
   - Success: exports a brief with confidence and rationale.

### Core jobs (ordered)
1. Understand current regime and confidence.
2. Decide organizational posture for the next 1–4 weeks.
3. Convert posture into team-specific actions.
4. Communicate rationale and plan with minimal editing.

---

## 3) Information architecture (final state)

### Top-level navigation (task-first)
- **Decide** (`/`) — make the posture call now.
- **Plan** (`/plan`) — assign actions by team and horizon.
- **Evidence** (`/evidence`) — inspect methodology, thresholds, and data provenance.
- **Brief** (`/brief`) — generate and share communication artifacts.

### Supporting navigation (utility)
- **History** (`/history`) — prior calls and outcomes.
- **Workstreams** (`/workstreams/[team]`) — team-specific deep views.
- **Methods** (`/methods`) — model internals and source documentation.

### IA rule of thumb
If a screen does not help users complete the Decide → Plan → Brief loop,
it belongs in Evidence/Methods/History, not in Decide.

---

## 4) Screen contracts (what each route must do)

## `/` Decide
**Primary question:** What should we do this week?

**Required modules above the fold (desktop):**
1. `DecisionBanner`
   - posture label (`Accelerate`, `Balanced`, `Defensive`)
   - confidence (0–100 + verbal band)
   - freshness timestamp
2. `ActionTriplet`
   - one recommendation each for Product/Engineering/Finance
3. `NextStepCTA`
   - single dominant action: `Open plan`

**Explicit anti-goals:**
- No long source tables on this route.
- No more than one primary CTA in first viewport.

## `/plan`
**Primary question:** Who owns what, by when?

**Required modules:**
1. `HorizonBoard` columns: `Now (0-2w)`, `Next (2-6w)`, `Watch (6w+)`
2. `TeamFilterTabs` persisted in URL (`?team=engineering`)
3. `AssignmentState` (unassigned / assigned / blocked / done)
4. `CoverageMeter` (shows if each team has at least one active action)

**Explicit anti-goals:**
- Do not duplicate macro narrative paragraphs already in Decide.

## `/evidence`
**Primary question:** Why is this recommendation credible?

**Required modules:**
1. `RegimeTimeline`
2. `ConfidenceBreakdown`
3. `ThresholdInspector`
4. `SourceProvenanceTable` (sortable, compact default)

**Explicit anti-goals:**
- No assignment UI.
- No export UI.

## `/brief`
**Primary question:** How do I communicate this in 2 minutes?

**Required modules:**
1. `AudiencePreset` (`Exec`, `Product+Eng`, `Board-lite`)
2. `BriefComposer` blocks: Decision / Why / Actions / Risks / Requests
3. `ExportActions` (`Copy`, `Markdown`, `PDF`)
4. `HandoffFooter` links back to Plan and Evidence

**Explicit anti-goals:**
- No dense exploratory analytics.

---

## 5) End-to-end UX flows

### Flow A: Weekly operator flow (default)
1. Open **Decide** and confirm posture.
2. Click **Open plan**.
3. In **Plan**, filter by team and assign owners.
4. Click **Prepare brief**.
5. In **Brief**, choose audience preset and export.

**Target completion:** < 5 minutes.

### Flow B: Trust verification flow
1. From Decide, click `Why this call?`.
2. Land in Evidence with confidence section pre-opened (`?panel=confidence`).
3. Inspect thresholds + sources.
4. Return to Decide with preserved state.

**Target completion:** < 3 minutes.

---

## 6) Content strategy (rewrite rules)

### From analyst wording to operator wording
- Replace: "volatility regime remains elevated"
- With: "Delay discretionary launches 2 weeks; protect reliability sprint capacity."

### Writing constraints
- Recommendation sentences: max 140 characters each.
- One sentence summary per section before any expandable detail.
- Confidence always shown as label + numeric value (e.g., `High (78/100)`).

---

## 7) Interaction and accessibility standards

- URL is source of truth for tabs, filters, and drawers.
- Back button must reverse last state transition (tab/filter/modal).
- Touch targets >= 44px.
- Keyboard-only completion of Decide → Plan → Brief required.
- Layout stability: reserve space for async modules to keep CLS at/near zero.

---

## 8) Analytics plan (event schema)

### Core events
- `decision_viewed` { posture, confidence, freshness_age }
- `plan_opened` { source_route }
- `assignment_created` { team, horizon }
- `evidence_opened` { source_route, panel }
- `brief_exported` { format, preset }

### Primary outcome metrics
1. **Time to first assignment** (target: -35%).
2. **Decide → Plan completion rate** (target: +30%).
3. **Plan → Brief export conversion** (target: +25%).
4. **Route oscillation rate** (home/signals/ops bouncing) (target: -40%).

---

## 9) Migration roadmap with release gates

## Phase 0 (prep, 1 sprint)
- Add shared shell primitives: `DecisionBanner`, `NextStepCTA`.
- Instrument baseline analytics events.
- Add route aliases and redirects map.

**Gate:** baseline metrics available for 2 weeks.

## Phase 1 (Decide + Plan, 1–2 sprints)
- Ship new Decide route composition.
- Launch Plan board replacing scattered checklist modules.
- Add URL-synced filters + assignment states.

**Gate:** 80% of beta users complete Decide → Plan without navigation help.

## Phase 2 (Evidence, 1 sprint)
- Consolidate trust/provenance into Evidence.
- Remove duplicated methodology callouts from Decide/Plan.

**Gate:** no trust-related support regressions vs baseline.

## Phase 3 (Brief, 1 sprint)
- Launch audience presets and export formats.
- Add confirmation handoff to Plan/Evidence.

**Gate:** +25% export completion from weekly active sessions.

## Phase 4 (cleanup, ongoing)
- Decommission obsolete route sections.
- Standardize naming and component taxonomy.

---

## 10) Risks and mitigations

1. **Navigation relearning cost**
   - Mitigation: temporary labels (`Evidence (formerly Signals)`), in-product changelog, and redirects.
2. **Perceived oversimplification**
   - Mitigation: preserve deep Evidence route with transparent thresholds and sources.
3. **Brief quality inconsistency**
   - Mitigation: locked block structure + preset templates + preview parity.
4. **Adoption fragmentation across teams**
   - Mitigation: team filters and workstream deep links from Plan.

---

## 11) Definition of done

The IA/UX rethink is complete only when all are true:
1. Users can complete Decide → Plan → Brief in one pass without route hunting.
2. Evidence is one click away but not required for basic action flow.
3. Route names map to user intent, not internal architecture.
4. Metrics show meaningful lift on assignment speed and brief exports.
