# Information architecture proposal

## Goal
Align primary navigation labels with task intent so leaders can move from context to action faster.

## Proposed top-level language
- **Command Center** (`/start`) for posture-first orientation and routing.
- **Signals** (`/signals`) for macro state and confidence context.
- **Operations** (`/operations`) for execution guardrails by posture.
- **Decide** (`/decide`) for role/situation decision pathways.
- **Plan** (`/plan`) for implementation surfaces and toolkits.
- **Learn** (`/learn`) for diagnostics and conceptual references.
- **Method** (`/method`) for model transparency and trust context.

## Legacy route compatibility
To preserve inbound links and historical references, legacy entrypoints should redirect:
- `/guides` → `/learn`
- `/solutions` → `/plan`
- `/brief/stage` → `/plan`
- `/brief` → `/start`
- `/method` should act as a hub that links to both `/methodology` and `/about` to align trust expectations with user intent.

## Migration notes
- Provide IA-consistent bridge paths (`/decide/use-cases`, `/plan/toolkits`, `/learn/failure-modes`, `/learn/concepts`) that redirect to legacy surfaces while preserving old information depth.
- Extend bridge-path coverage to detail routes (`/decide/[slug]`, `/plan/[slug]`, `/learn/failure-modes/[slug]`, `/learn/concepts/[slug]`) to keep URL semantics consistent beyond hub pages.
- Keep legacy destination pages available during transition windows for backlink continuity.
- Update sitemap priorities to reflect new IA anchors while retaining discoverability for legacy paths.
- Ensure report shell navigation highlights new labels when users land on legacy URLs.
