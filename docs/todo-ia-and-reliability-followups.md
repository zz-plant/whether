# IA and reliability follow-up TODOs

Completed in this patch:
- Redirect aliases for `/operate`, `/templates`, `/toolkit`
- Safe report loader + degraded rendering on `/` and `/operations`
- Per-dial semantics and rationale text for operating dials
- Canonical regime formatter adopted in report + export surfaces

Remaining backlog from audit:
- Audit and update all internal links for legacy aliases beyond current nav redirects
- Expand degraded-state handling to every route that currently calls `loadReportData(...)`
- Add richer dependency attribution around treasury vs macro failures
- Enforce noun discipline copy pass (regime vs posture vs environment)
- Bind action strip items to measurable stop/flip conditions
- Add route smoke coverage and route canonicalization contributor checklist
