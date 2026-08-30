# Front-end inefficiencies and anti-patterns audit

> **⚠️ HISTORICAL** — Issues identified here were resolved by the Vinext migration (2026-03) and subsequent component refactors. See `docs/implementation-status.md` for the stack modernization record.

Date: 2026-03-12
Scope: `app/` front-end surfaces

1. **Top-level header is fully client-rendered for route awareness**  
   `GlobalHeader` is marked `"use client"` and hydrates the entire navigation tree just to compute pathname-derived active state and route hiding. This pushes avoidable JS to all pages.

2. **Search command center does synchronous storage writes on every state change**  
   The command center writes `query` and `filter` to `sessionStorage` in effects keyed directly to those values. This creates unnecessary main-thread churn while typing and could be debounced or persisted on blur/idle.

3. **Global keyboard listener is re-registered as query length changes**  
   The `keydown` listener effect depends on `query.length`, which means repeated attach/detach during input interactions. A stable handler with refs would reduce listener churn.

4. **Report shell navigation is a very large client bundle hotspot**  
   `reportShellNavigation.tsx` combines behavior, section state logic, and a large inline SVG icon map in one client component, increasing parse/hydration cost on every shell page.

5. **Hardcoded section-label map can drift from canonical section anchors**  
   `sectionCompactLabelByHref` hardcodes hash IDs in one place while home section anchors are defined separately elsewhere, creating drift risk and brittle navigation if IDs change.

6. **Legacy redirect pages are duplicated per slug instead of centralized mapping**  
   Multiple route files repeat the same `revalidate + redirect` implementation. This is route-sprawl and maintenance overhead that could be centralized (single dynamic route or redirect map).

7. **Board brief panels are client-rendered even though most content is static**  
   `boardBriefSections.tsx` is client-only while containing large amounts of static rendering and deterministic formatting. Splitting tooltip-only interaction into smaller client islands would shrink hydration.

8. **Internal navigation uses raw `<a href>` in interactive surfaces**  
   Several internal links are plain anchors in board/report shell surfaces, which bypasses Next.js prefetch/navigation ergonomics and can trigger full document navigations.

9. **Static SVG marker ID is not instance-safe**  
   `curveMarkerId` is a fixed string (`"curve-marker"`) used in SVG defs. If multiple instances render on one page, ID collisions are possible and can cause wrong marker linkage.

10. **Mega-prop interface in `WeeklyDecisionCard` signals prop-drilling and recomposition friction**  
    The card accepts a very large `WeeklyDecisionCardProps` object with many nested fields, coupling callers and rendering logic tightly. Grouped view models would improve maintainability and render optimization.

## Suggested prioritization

1. Split large client files (`globalHeader`, `boardBriefSections`, `reportShellNavigation`) into server-first composition + small client islands.
2. Consolidate redirect route stubs into one redirect registry.
3. Debounce/persist command-center query state less aggressively.
4. Replace internal `<a>` links with `next/link` where appropriate.
5. Introduce typed view-model slices for `WeeklyDecisionCard` and sibling panels.
