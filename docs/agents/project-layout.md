# Project layout

## Primary source directories
- `app/` — Next.js App Router pages, route handlers, and UI components.
- `lib/` — regime engine, data clients, decision logic, and shared utilities.
- `data/` — local snapshots/caches used for deterministic and fallback behavior.
- `tests/` — Node-based test suites.
- `scripts/` — build and data maintenance scripts.

## Supporting directories
- `docs/` — architecture, specs, roadmap, and contributor guidance.
- `.github/` — templates and automation metadata.

## Editing guidance
- Keep scoring/classification logic in core modules under `lib/`.
- Treat `lib/decisionDomainCatalog.ts` as the canonical operator-domain catalog (posture, decide, toolkits, failure modes); keep navigation IA concerns in `lib/navigation/informationArchitecture.ts`.
- Keep user-facing behavior changes paired with nearby tests and docs updates.
- Prefer local edits in existing modules over introducing new top-level structures.

## Nested agent guides in high-churn areas

Check local `AGENTS.md` files before editing these directories:
- `lib/report/` — canonical report semantics, trust states, and shared decision copy
- `app/components/weekly-card/` — surviving weekly-card pieces (diagnostics section, decision-support copy); the top fold itself renders from `app/page.tsx`
- `app/components/home/` — homepage orchestration and route handoffs
- `app/planning/components/` — planning/export checkpoint behavior
- `app/evidence/` — evidence-route scope and signal diagnostics
