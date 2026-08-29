# Layout architecture plan

Date: 2026-08-29
Method: enumerated every shell component and every route's outer container, then fetched 20 routes
from a running dev server and inspected the delivered HTML. Measurements below are from that HTML,
not from reading the source.

## The finding: nothing owns the `<main>` landmark

The root layout renders `<a class="skip-link" href="#main-content">` on every page. Whether that
anchor exists is decided independently by whichever shell a page happens to use, and four different
components each render their own `<main id="main-content">`:

- `pageShell.tsx` — the outer chrome main
- `Shell.tsx` — the homepage main (`data-home-shell-main`)
- `reportShell.tsx` — via `PageShell`
- `routeLoadingShell.tsx` — via `ReportShell`, via `PageShell`

Meanwhile `contentPageShell.tsx` and several pages render a bare `<main>` with no id at all.

**Measured result: 8 of 20 routes render the skip link with no target.** Pressing it does nothing.

| Dead skip link | Cause |
| --- | --- |
| `/answer/ship-checklist`, `/history/2025` | `ContentPageShell` sets no id (11 routes total use it) |
| `/about`, `/contact`, `/resources/decision-shield-overview` | bare `<main>`, no id — all three carry the same `max-w-3xl` chain longhand |
| `/search`, `/template` | no `<main>` reaches the output |
| `/embed` | bare `<main>`; arguably correct — see non-goals |

This is WCAG 2.4.1 (Bypass Blocks). It is also the cheapest possible fix, because every one of these
pages already renders exactly one `<main>` — it just has no id.

### The second-order symptom

On routes with a `loading.tsx`, the streamed SSR HTML contains **two** `<main id="main-content">`
elements: the Suspense fallback (`RouteLoadingShell` → `ReportShell` → `PageShell`) and the resolved
content. Verified on `/` and `/trust`. Hydration removes the fallback, so this is invisible in a
browser — but a crawler, a reader with JS off, and any tool parsing the SSR response all see a
duplicate id and nested landmarks.

That is not a bug in `loading.tsx`. It is what happens when four components each believe they own
the landmark.

## The second finding: five content measures, no rule

| Measure | px | Where |
| --- | --- | --- |
| `max-w-2xl` | 672 | `/template` |
| `max-w-3xl` | 768 | `/about`, `/contact`, `/api-docs`, `/share`, `/threshold`, `hubPageShell` |
| `max-w-4xl` | 896 | `ContentPageShell` (11 routes), `legalPageShell`, `/embed` |
| `max-w-[64rem]` | 1024 | `/`, `/pricing` |
| `max-w-[72rem]` | 1152 | `reportShell`, `Shell` |

Nothing states which measure a new page should take, so the answer is "whatever the page you copied
used". `/about` and `/contact` carry the *exact* class chain `ContentPageShell` encapsulates, differing
only in `3xl` vs `4xl` — they are the same shell with a different measure, written out longhand.

## The third finding: ten shells, and I added the tenth blind

`Shell`, `hubPageShell`, `legalPageShell`, `pageShell`, `reportSection`, `reportShell`,
`routeLoadingShell`, `secondaryPageShell`, `contentPageShell`, plus the route `layout.tsx` files.
All are used; none of them documents how it relates to the others.

`ContentPageShell` was added in #1312 to remove twelve copies of one class chain. That was worth
doing, but it was written without knowing the other nine existed — which is itself the evidence for
this plan. A tenth shell is only an improvement if the set has a stated shape.

## Target: three layers, each with one owner

1. **Chrome** — **exactly one element per rendered route carries `id="main-content"`.** The
   invariant is about the route's output, not about which component produces it.

   An earlier draft of this plan said the owner must be `PageShell` specifically, and then Phase 1
   assigned the id to `ContentPageShell` as well while leaving `Shell` and `secondaryPageShell`
   rendering their own — three independent owners, which is the condition this document blames for
   the defect. That inconsistency was real, and the fix is to weaken the invariant rather than the
   phase: routing every page through `PageShell` would force its chrome (climate backdrop, web
   vitals, display mode, footer) onto pages that deliberately opt out, which is a larger and less
   defensible change than the defect warrants.

   Per-route uniqueness is what the skip link actually depends on, it is what Phase 3 can check, and
   it permits `PageShell`, `Shell`, `secondaryPageShell` and `ContentPageShell` to each own the
   landmark on the routes they serve — provided no route gets two and none gets zero.
2. **Measure** — a named, closed set. Long-form prose, standard content, and wide data surfaces are
   genuinely different problems and deserve three names, not five ad-hoc `max-w` values.
3. **Section** — `ReportSection` and friends, unchanged. Already scoped, already documented in §XI.

## Plan

### Phase 1 — give the landmark one owner (accessibility, small, mechanical)

- `ContentPageShell` renders `id="main-content"`, and **stops accepting an `id` from callers**. It
  already renders the only `<main>` on all 11 of its routes, verified — no page combines it with
  `PageShell`, and the `signals`/`operate` route layouts are pass-through, so there is nothing to
  nest with.
- **Relocate the `top` anchor first.** `app/resources/[slug]/page.tsx` passes `id="top"` into the
  shell and links back to `#top` from its sections. Leaving `id` overridable keeps the skip link
  dead on those routes; silently overriding it breaks the back-to-top links. Move `top` onto a
  wrapper inside the shell, then close the prop.
- `/about`, `/contact` and `/resources/decision-shield-overview` adopt `ContentPageShell` at the
  prose measure (see Phase 2). The third is a standalone page with its own bare `<main>`, not a
  `ContentPageShell` consumer, so it needs its own migration rather than coming along for free.
- `/search` and `/template` get individual attention: neither currently reaches a `<main>` in the
  output despite `/template` importing `PageShell`, which wants explaining before it is changed.
- Resolve the loading-fallback duplicate by making the fallback path not re-render the chrome layer,
  so the streamed HTML carries one landmark.

**Done when:** every route renders exactly one `id="main-content"`, and the skip link works on all of
them.

### Phase 2 — name the measures

Replace the five ad-hoc widths with three named ones, defined once and referenced by name:

| Name | Measure | For |
| --- | --- | --- |
| prose | 3xl / 768 | long-form reading: about, contact, legal, api-docs, threshold |
| content | 4xl / 896 | standard pages: the `ContentPageShell` family |
| wide | 72rem / 1152 | data surfaces with a sidebar or dense grid: report shells, home |

`ContentPageShell` currently refuses `className` on the reasoning that an escape hatch is how
duplication returns. That reasoning holds for free-form classes and fails for measure — which is why
`/about` and `/contact` hand-rolled the chain instead of adopting the shell. A closed `measure` prop
is the narrow exception: it cannot drift, because the set is enumerated.

**Done when:** no page sets a bare `max-w-*` on its outer container, and adding a page means picking
one of three names.

### Phase 3 — a guard that fires

A test that fetches each route and asserts exactly one `id="main-content"`. The capture harness added
in #1311 already drives a browser over the report surfaces; this is the same shape and would have
caught all eight dead skip links.

Worth stating plainly: lint, typecheck and 935 unit tests all pass on a page whose skip link points
at nothing. Only fetching the page finds it.

**Done when:** deleting the id from any shell turns the suite red.

## Non-goals

- **Collapsing the ten shells into fewer components.** They mostly encode real differences. The
  problem is that the layering is undocumented, not that the count is high; Phase 1 and 2 fix the
  parts that produce defects.
- **`/embed`'s missing skip link.** It is an iframe surface with deliberately no chrome. The right
  answer is probably to not render the skip link there at all, which is a question about the embed
  contract rather than about layout.
- **Reflowing any page's visual design.** Phase 2 changes which constant a page references, and only
  changes rendered width where a page is currently on a measure its content contradicts.
