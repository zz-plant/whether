# Information architecture proposal

## Goal
Align primary navigation labels with task intent so leaders can move from context to action faster.

## Proposed top-level language
- **Command Center** (`/start`) for posture-first orientation and routing.
- **Signals** (`/signals`) for macro state and confidence context.
- **Operations** (`/operations`) for execution guardrails by posture.
- **Decide** (`/decide`) for role/situation decision pathways.
- **Plan** (`/toolkits`) for implementation surfaces and runnable instruments.
- **Learn** (`/learn`) for diagnostics and conceptual references.
- **Method** (`/method`) for model transparency and trust context.

## Canonical route policy
- Keep one canonical namespace per content family.
- Canonical failures path: `/library/failure-modes/*`.
- Canonical concepts path: `/concepts/*`.
- Canonical decision path: `/decide/*`.
- Canonical planning path: `/toolkits/*`.

## Legacy route compatibility
During migration windows, use redirect infrastructure at the edge/app boundary only.
- `/guides` → `/learn`
- `/solutions` → `/toolkits`
- `/brief` → `/start`

Avoid maintaining long-lived duplicate bridge pages in the application tree.

## Migration notes
- Remove duplicate bridge-route files once canonical URLs are active in navigation and internal links.
- Update sitemap priorities to reflect canonical IA anchors only.
- Keep legacy entrypoints discoverable via redirects temporarily, then retire after link/traffic decay.
- Preserve deep legacy backlinks via catch-all redirect bridges for `/guides/*` and `/solutions/*` during migration windows to avoid SEO equity loss.
- Ensure report shell navigation highlights canonical labels even when users arrive from old URLs.


## Deprecation window policy
- Keep redirect stubs for legacy paths for at least one migration window before removal.
- Track legacy route hits at the edge/app layer and retire only when usage is materially decayed.
- Prioritize stability for bookmarked and shared links over aggressive route deletion.

Current compatibility stubs should include:
- `/onboarding` → `/start`
- `/operations/plan` → `/operations`
- `/use-cases/*` → `/decide/*`
- `/learn/concepts/*` → `/concepts/*`
- `/learn/failure-modes/*` → `/library/failure-modes/*`
