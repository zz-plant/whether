# Information architecture proposal

## Goal
Align primary navigation labels with task intent so leaders can move from context to action faster.

## Proposed top-level language
- **Command Center** (`/start`) for posture-first orientation and routing.
- **Signals** (`/signals`) for macro state and confidence context.
- **Operations** (`/operations`) for execution guardrails by posture.
- **Decide** (`/decide`) for role/situation decision pathways.
- **Toolkits** (`/toolkits`) for implementation surfaces and runnable instruments.
- **Learn** (`/learn`) for diagnostics and conceptual references.
- **Method** (`/method`) for model transparency and trust context.

## Legacy route compatibility
To preserve inbound links and historical references, legacy entrypoints should redirect:
- `/guides` → `/learn`
- `/solutions` → `/toolkits`
- `/brief/stage` → `/toolkits`
- `/brief` → `/start`
- `/method` should act as a hub that links to both `/methodology` and `/about` to align trust expectations with user intent.

## Migration notes
- Keep `/decide/use-cases` and `/decide/[slug]` as entry-point bridge paths because they support intent-based routing.
- Consolidate concept discovery on `/concepts` (and `/concepts/[slug]`) and failure-mode diagnostics on `/library/failure-modes` (and `/library/failure-modes/[slug]`).
- Preserve `/learn/concepts*` and `/learn/failure-modes*` only as redirect compatibility paths; do not prioritize them as canonical discovery URLs.
- Keep legacy destination pages available during transition windows for backlink continuity.
- Update sitemap priorities to favor canonical hubs and detail pages while excluding redirect-only bridge paths.
- Ensure report shell navigation highlights current labels when users land on compatibility URLs.
