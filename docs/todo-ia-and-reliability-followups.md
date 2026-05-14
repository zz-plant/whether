# IA and reliability follow-up TODOs

Completed in this patch:
- Redirect aliases for `/operate`, `/templates`, `/toolkit`
- Safe report loader + degraded rendering on `/` and `/planning`
- Expanded safe-loader adoption across additional page and API report consumers
- Per-dial semantics and rationale text for operating dials
- Canonical regime formatter adopted in report + export surfaces
- Structured dependency attribution now tags treasury vs macro failures at fetch time
- Route smoke coverage now includes canonical route checks and legacy redirect parity checks
- Route canonicalization contributor checklist documented in `docs/development-playbook.md`

Remaining backlog from audit:
- None from this patch scope. Open IA/design follow-ups are tracked separately in `docs/design-debt-prioritized.md`.

## Plan-week execution status

| Backlog item | Owner | Day | Status | Notes |
| --- | --- | --- | --- | --- |
| Enforce noun discipline copy pass (regime vs posture vs environment) | Product + Eng | Day 1 | Complete | Glossary contract added in `docs/development-playbook.md`; canonical usage applied to shared/home copy surfaces. |
| Bind action strip items to measurable stop/flip conditions | Product + Eng | Day 1 | Complete | Action-strip contract added and propagated to homepage, operations, and export artifacts with coverage in regression tests. |
