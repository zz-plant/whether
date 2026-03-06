# IA and reliability follow-up TODOs

Completed in this patch:
- Redirect aliases for `/operate`, `/templates`, `/toolkit`
- Safe report loader + degraded rendering on `/` and `/operations`
- Expanded safe-loader adoption across additional page and API report consumers
- Per-dial semantics and rationale text for operating dials
- Canonical regime formatter adopted in report + export surfaces
- Structured dependency attribution now tags treasury vs macro failures at fetch time
- Route smoke coverage now includes canonical route checks and legacy redirect parity checks
- Route canonicalization contributor checklist documented in `docs/development-playbook.md`

Remaining backlog from audit:
- Enforce noun discipline copy pass (regime vs posture vs environment)
- Bind action strip items to measurable stop/flip conditions
