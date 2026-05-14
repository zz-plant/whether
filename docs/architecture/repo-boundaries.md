# Repo Boundaries

This repo is moving toward three explicit systems:

1. `decision-engine`
2. `content-system`
3. `delivery-shell`

The goal is to reduce content-shaped code in the app layer, keep canonical posture
semantics in one place, and make route/API changes cheaper without weakening the
weekly brief product loop.

## 1. Decision Engine

Owns:
- signal ingestion normalization inputs
- regime and posture evaluation
- bounded decision generation
- trust/fallback semantics
- export-ready decision artifacts

Primary current modules:
- `lib/report/*`
- `lib/regimeEngine.ts`
- `lib/regimeEngineCore.ts`
- `lib/playbook.ts`
- `lib/thresholds.ts`

Technical JTBD:
- keep `signals -> posture -> decision -> artifact` pure and reusable
- prevent route/UI concerns from mutating canonical semantics
- support alternative shells and APIs without logic duplication

## 2. Content System

Owns:
- resources
- answers
- concepts
- route metadata for editorial surfaces
- static SEO/programmatic copy registries

Primary current modules:
- `content/resources/*`
- `content/answers/*`
- future `content/concepts/*`
- typed loaders under `lib/*ContentSource.ts`

Technical JTBD:
- represent content as validated data instead of TypeScript catalogs
- generate routes and metadata from typed content contracts
- reduce LOC spent on registries, static params, and manual indexing plumbing

## 3. Delivery Shell

Owns:
- interactive operator UI
- route handlers and external API responses
- persistence adapters
- telemetry and auth checks

Primary current modules:
- `app/*`
- `app/api/*`
- `lib/api/*`
- `lib/storage/*`

Technical JTBD:
- keep live operator surfaces focused on execution and trust
- standardize route/API behavior behind shared helpers
- isolate persistence from decision semantics

## Surface Placement

Keep in delivery shell:
- `/`
- `/planning`
- `/evidence`
- export and planning surfaces tied to the live weekly call

Move toward content-system ownership:
- `/answers`
- `/resources`
- `/concepts`
- editorial toolkit/concept/supporting SEO surfaces

## Sequencing

Recommended implementation order:

1. Externalize remaining content registries into `content/*` with typed loaders.
2. Add a package boundary for the decision engine using stable re-exports first.
3. Consolidate API behavior behind shared typed edge helpers.
4. Move durable state from bespoke KV repositories toward typed relational storage.

## Non-goals

- Rewriting the full interactive app into a different runtime first
- Splitting the canonical report semantics across content and UI layers
- Treating content migration as a substitute for simplifying domain boundaries
