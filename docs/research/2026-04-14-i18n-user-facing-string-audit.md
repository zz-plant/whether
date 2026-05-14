# I18n user-facing string audit

Type: Evidence

Date: 2026-04-14

## Outcome

Whether has a clear path to i18n, but it is not structured for low-friction localization yet.

- There is not yet a translation boundary or locale provider in the app.
- User-facing English copy currently lives directly in route components, shared UI components, report builders, metadata, manifests, OG image payloads, and large content catalogs.
- Locale formatting is still pinned to `en-US` in multiple places.

An extraction pass over `app/` and `lib/` found roughly `2310` user-facing string-like literals, with the largest concentrations in:

- `app/` UI components and route pages
- `lib/report/*` report copy and decision copy builders
- `lib/decisionDomainCatalogContent.ts`
- `lib/resourceArticles.ts`

In practice, this means translation work starts as a repo-wide refactor, not a simple string-file backfill.

## What is already working in our favor

- The product already has strong semantic structure around navigation, trust, decision flows, and report composition.
- Several shared modules already act as natural consolidation points for future message ownership.
- The core weekly brief workflow is opinionated and well-bounded, which makes it possible to phase localization around the most important user paths first.

## How this audit was done

- Reviewed repo instructions and agent docs for docs placement and validation depth.
- Searched for existing i18n infrastructure (`next-intl`, `react-intl`, `useTranslations`, `formatMessage`, `t(`). None found.
- Scanned `app/` and `lib/` for:
  - JSX text
  - `label` / `title` / `description` / `summary` / `question` / `answer` style properties
  - accessibility text such as `aria-label`
  - locale-pinned `Intl.*` and `toLocale*` usage
- Spot-checked high-volume files to separate real blockers from low-signal matches.

Scope notes:

- Tests were not treated as product strings.
- CSS-only tokens were ignored unless they reflect user-visible copy contracts.
- Counts are directional; the key result is concentration and coupling, not the exact literal total.

## Highest-priority findings

### 1. No translation boundary exists

There is no app-level locale abstraction, no message catalog, and no `t()`-style composition layer.

Representative files:

- `app/page.tsx`
- `app/planning/page.tsx`
- `app/trust/page.tsx`
- `app/components/reportShell.tsx`
- `lib/report/reportCopy.ts`
- `lib/navigation/informationArchitecture.ts`

Impact:

- Every translated surface will require direct component and model changes.
- Shared report-shell strings and route copy cannot switch by locale cleanly until props and builders are refactored first.

### 2. Locale formatting is hardcoded to US English

These files pin date/number output to `en-US`:

- `lib/formatters.ts`
- `lib/timeMachine/monthFormatting.ts`
- `lib/report/homeBrief/historyAndContext.ts`
- `app/evidence/components/thresholdsPanel.tsx`

Representative examples:

- `new Intl.DateTimeFormat("en-US", ...)`
- `new Intl.NumberFormat("en-US", ...)`
- `toLocaleDateString("en-US", ...)`
- `toLocaleString("en-US", ...)`

Impact:

- Even if copy were translated, dates and numbers would still render in US English conventions.
- The current formatting layer also hardcodes UTC in many places, so locale and user timezone are both missing from the rendering contract.

### 3. Shared product copy is mixed into UI and model code

Many foundational labels currently live inside components or shared model builders instead of isolated copy dictionaries.

Representative files:

- `app/components/reportShell.tsx`
- `app/components/RegimeCommandBar.tsx`
- `app/components/actionStrip.tsx`
- `lib/report/decisionTransmissionCopy.ts`
- `lib/report/reportCopy.ts`
- `lib/literacyAssist.ts`
- `lib/navigation/informationArchitecture.ts`

Examples of affected string types:

- navigation labels and descriptions
- section headers
- CTA labels
- trust/fallback messaging
- onboarding and glossary copy

Impact:

- Translating one feature requires touching rendering logic, not just messages.
- Reuse across homepage, operations, trust, and answer flows is currently semantic reuse rather than localization reuse.

### 4. Large content catalogs are embedded as English data blobs

The repo has substantial long-form and structured content stored directly in TypeScript.

Highest-volume files from the scan:

- `lib/decisionDomainCatalogContent.ts`
- `lib/resourceArticles.ts`
- `app/about/page.tsx`
- `app/acceptable-use-policy/page.tsx`
- `app/terms-of-service/page.tsx`

These contain:

- decision-framework content
- role and toolkit descriptions
- FAQ questions and answers
- resource articles and board summaries
- policy/legal text

Impact:

- Localization will need content operations, not just engineering changes.
- Long-form content will need locale-specific ownership, review, and publishing workflows.
- Legal and policy pages will likely need separate review per locale before translation is considered shippable.

### 5. Dynamic English sentence assembly will not survive translation cleanly

Several files build user-facing sentences by concatenation or inline template literals.

Representative files:

- `app/answers/decisionAnswerPageContent.tsx`
- `lib/signalOps.ts`
- `lib/report/homeBrief/historyAndContext.ts`
- `lib/report/homeMetadata.ts`

Representative patterns:

- `"Short answer: ${liveShortAnswer}"`
- `` `${regime} regime as of ${date}.` ``
- `"Current risk appetite: ... / 100 · current tightness: ... / 100."`
- `"Trigger tighter mode if ..."`

Impact:

- Word order, punctuation, and grammatical agreement cannot be changed safely per locale.
- These should become message templates with named variables before localization starts.

### 6. SEO, manifest, and social/share surfaces are also English-only

User-visible copy is not limited to page bodies.

Representative files:

- `lib/report/homeMetadata.ts`
- `app/manifest.ts`
- `app/api/og/reportImageTemplate.tsx`
- `app/api/og/route.ts`
- `app/answers/[slug]/page.tsx`

Impact:

- A future locale launch would still ship English titles, descriptions, app manifest shortcuts, and social image labels unless these surfaces are explicitly included.
- SEO metadata needs locale-aware canonical/alternate handling, not only translated text.

## Hotspots by concentration

Highest-volume files from the extraction pass:

1. `lib/decisionDomainCatalogContent.ts`
2. `app/evidence/components/evidenceSections.tsx`
3. `app/mockups/operator-brief/page.tsx`
4. `app/trust/page.tsx`
5. `lib/resourceArticles.ts`
6. `app/planning/components/exportBriefPanel.tsx`
7. `app/planning/page.tsx`
8. `lib/report/reportCopy.ts`
9. `app/evidence/evidencePageModel.ts`
10. `app/about/page.tsx`

Rough concentration by area:

- app UI components: highest
- app route pages/layouts: very high
- lib report models/copy: high
- lib content catalogs: high
- lib navigation and formatting helpers: meaningful shared blockers

## Migration risks

### Shared semantics are spread across multiple modules

Labels like posture, trust, routing, and action language appear in more than one place. A naive extraction would likely create drift unless the first pass also consolidates ownership.

### Timezone behavior is coupled to copy behavior

Several strings combine translated labels with UTC-formatted dates and freshness text. Locale rollout should define:

- locale
- display timezone
- whether report timestamps stay fixed to UTC or follow user preference

### Structured outputs need their own contract

These surfaces need explicit localization support:

- JSON-LD / FAQ payloads
- copy-to-clipboard artifacts
- PWA manifest shortcuts
- OG image text
- email / Slack / export-ready briefs

## Recommended implementation order

### Phase 1: establish the boundary

- Add a single app-level locale contract and message lookup layer.
- Centralize date/number formatting behind locale-aware helpers instead of raw `Intl.*("en-US")`.
- Start with shared shell/navigation/report primitives rather than individual route pages.

### Phase 2: externalize shared product copy

- Move navigation, shell, CTA, trust, and onboarding copy into message namespaces.
- Refactor template-literal sentences into variable-based message templates.
- Keep one ownership point per semantic concept.

### Phase 3: route-by-route product surfaces

- Homepage / weekly brief
- operations
- trust
- signals
- answer / decide / toolkits flows

This order follows the current product loop and gets the canonical artifact translatable first.

### Phase 4: content catalogs and long-form pages

- `lib/decisionDomainCatalogContent.ts`
- `lib/resourceArticles.ts`
- about / policy / legal pages

These should likely use a content-oriented localization path rather than inline TS objects forever.

### Phase 5: non-body surfaces

- metadata
- manifest
- structured data
- OG images
- copy-export/share payloads

## Minimum engineering checklist before starting translation work

- Introduce locale-aware formatter helpers.
- Ban new hardcoded user-facing strings in shared components.
- Add an extraction or lint check for untranslated literals in `app/` and `lib/report/`.
- Define message namespace ownership for:
  - navigation
  - shell
  - trust/fallback
  - operations
  - signals
  - answers
  - long-form resources

## Recommendation

The strongest starting point is not translating strings one file at a time.

Start by refactoring the shared boundaries:

1. locale contract
2. formatter contract
3. shared shell/navigation/report copy
4. dynamic sentence composition

Without that foundation, translation work will be slower, less consistent, and more likely to create semantic drift across the core weekly brief workflow.
