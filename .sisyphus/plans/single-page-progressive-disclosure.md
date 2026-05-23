# #13: Single-page progressive disclosure — architecture plan

## What changes

`/evidence`, `/trust`, and `/resolve` become expandable sections on `/` instead of separate routes. The product becomes one artifact with depth, not a site with breadth.

**User flow:**
1. Land on `/` → see the weekly brief (hero + decision card), same as today
2. Scroll below the decision card → three expandable sections: "Why this call" (evidence), "Is this reliable?" (trust), "Have a question?" (resolve)
3. Click "Why this call" → evidence section expands inline, data loads progressively, shows sensor readings and signal diagnostics
4. Click "Is this reliable?" → trust dashboard expands, shows system status
5. Click "Have a question?" → resolve tools expand, shows decision translation
6. URL updates to `/#evidence`, `/#trust`, `/#resolve` — shareable, back-button-safe
7. Standalone routes (`/evidence`, `/trust`, `/resolve`) continue to work as full pages (SEO fallback, direct links)

---

## Architecture

### Component tree

```
/ (page.tsx)
├── BriefHero
├── DecisionCard (memo format)
├── ProgressiveSections (new wrapper)
│   ├── ProgressiveSection (evidence)
│   │   └── Suspense fallback (skeleton)
│   │       └── EvidenceContent (lazy loaded)
│   │           └── SensorArray, SignalDiagnostics, etc.
│   ├── ProgressiveSection (trust)
│   │   └── Suspense fallback (skeleton)
│   │       └── TrustContent (lazy loaded)
│   │           └── TrustDashboard, SourceHealth, Warnings
│   └── ProgressiveSection (resolve)
│       └── Suspense fallback (skeleton)
│           └── ResolveContent (lazy loaded)
│               └── DecisionTools, TranslationPanels
└── Explore scenarios (existing collapsible tools)
```

### URL state management

```
Hash-based routing:
  /                    → all sections collapsed
  /#evidence           → evidence expanded, rest collapsed
  /#trust              → trust expanded
  /#resolve            → resolve expanded

Implementation:
  - useHash hook reads window.location.hash on mount
  - hashchange event listener syncs state
  - Expanding a section sets the hash (pushState, not replaceState — preserves back button)
  - Collapsing clears the hash
  - Standalone routes use the full page models (existing behavior)
```

### Data loading strategy

Each section's data is loaded lazily — only when the section expands:

```typescript
// ProgressiveSection loads data on expand
function ProgressiveSection({ id, label, loadData, children }) {
  const [expanded, setExpanded] = useState(hash === `#${id}`);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (expanded && !data) {
      loadData().then(setData);
    }
  }, [expanded]);

  return expanded ? (
    <Suspense fallback={<Skeleton />}>
      {children(data)}
    </Suspense>
  ) : (
    <CollapsedSummary label={label} onClick={() => setExpanded(true)} />
  );
}
```

Data loaders are thin wrappers around existing page models:
- `loadEvidenceSection()` → calls `buildSignalsPageModel()` (already exists)
- `loadTrustSection()` → calls `buildTrustPageModel()` (already exists)
- `loadResolveSection()` → calls the resolve page's data loading (already exists)

---

## Files to create

| File | Purpose |
|---|---|
| `app/components/home/ProgressiveSection.tsx` | Expand/collapse wrapper with lazy loading + hash sync |
| `app/components/home/ProgressiveSections.tsx` | Container for the three sections, manages which is expanded |
| `app/components/home/EvidenceContent.tsx` | Renders evidence data (wraps existing evidence components) |
| `app/components/home/TrustContent.tsx` | Renders trust data (wraps existing trust components) |
| `app/components/home/ResolveContent.tsx` | Renders resolve data (wraps existing resolve components) |

## Files to modify

| File | Change |
|---|---|
| `app/page.tsx` | Add ProgressiveSections below the decision card, above Explore |
| `app/components/reportShell.tsx` | No changes needed — progressive mode is page-level, not shell-level |
| `app/components/globalHeaderNavClient.tsx` | Update "Deepen" link to scroll to `/#evidence` instead of navigating to `/evidence` |
| `app/evidence/page.tsx` | Mark as fallback-only (add canonical URL pointing to `/#evidence`). Keep the full page rendering for SEO |
| `app/trust/page.tsx` | Same — canonical URL to `/#trust` |
| `app/resolve/page.tsx` | Same — canonical URL to `/#resolve` |
| `lib/navigation/globalHeader.ts` | Update Deepen href from `/evidence` to `/#evidence` when on `/` |
| `lib/navigation/informationArchitecture.ts` | Add `progressiveSection` field to navigation layers |

## Files NOT modified

| File | Why |
|---|---|
| Evidence page model (`evidencePageModel.ts`) | Reused as-is by EvidenceContent |
| Trust page model (`trustPageModel.ts`) | Reused as-is by TrustContent |
| Resolve page model | Reused as-is by ResolveContent |
| SensorArray, MacroSignalsPanel, etc. | Rendered inside EvidenceContent, no changes |
| SourceHealthPanel, MethodSection, etc. | Rendered inside TrustContent, no changes |
| ReportShell | Progressive mode doesn't change shell — sections are children |

---

## SEO strategy

Standalone routes remain as full pages with their own `<head>` tags and structured data. Each standalone page gets a `<link rel="canonical" href="/#section" />` pointing to the progressive version. Search engines index the standalone pages but users who land on them see the full-page version (which is identical to the progressive content).

```
/evidence → full page (SEO) → canonical: /#evidence
/trust    → full page (SEO) → canonical: /#trust
/resolve  → full page (SEO) → canonical: /#resolve
```

---

## Navigation update

The 3-step nav (Decide / Plan / Deepen) changes behavior when on `/`:

| Nav item | Current | New |
|---|---|---|
| Decide | Navigate to `/` | Scroll to top (already on `/`) |
| Plan | Navigate to `/planning` | Navigate to `/planning` (unchanged) |
| Deepen | Navigate to `/evidence` | Scroll to `/#evidence` and expand the evidence section |

When on `/planning` or other routes, Deepen still navigates to `/evidence` as a standalone page.

---

## ProgressiveSection component spec

```typescript
type ProgressiveSectionProps = {
  id: string;              // "evidence" | "trust" | "resolve"
  label: string;           // "Why this call" | "Is this reliable?" | "Have a question?"
  description: string;     // One-line summary shown when collapsed
  loadData: () => Promise<SectionData>;  // Lazy data loader
  children: (data: SectionData) => ReactNode;  // Render prop
};

// States:
// 1. Collapsed — shows label + description + expand arrow
// 2. Loading — shows skeleton pulse (first expand)
// 3. Loaded — shows content (subsequent expands are instant)
// 4. Error — shows "Couldn't load" with retry button
```

---

## Implementation order

| Phase | What | Why first |
|---|---|---|
| **1. ProgressiveSection component** | Build the expand/collapse wrapper with hash sync, lazy loading, skeleton, and error states | Foundation everything else depends on |
| **2. EvidenceContent** | Wrap existing evidence page model and components | Evidence is the most natural first section ("Why this call") |
| **3. Wire into homepage** | Add ProgressiveSections below the decision card | Test the full flow with one section |
| **4. TrustContent + ResolveContent** | Wrap trust and resolve page models | Complete the three sections |
| **5. Navigation update** | Update Deepen nav link and global header | Users can discover the progressive sections |
| **6. SEO fallback** | Add canonical URLs to standalone pages | Preserve search rankings |

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Bundle size increase | Each section's code is lazy-loaded (dynamic import). Only loads when expanded |
| URL state complexity | Hash-based routing is simple and well-tested. No router dependency needed |
| SEO impact | Standalone pages preserved with canonical URLs. Sitemap unchanged |
| Data loading performance | Existing page models are fast (edge functions). First expand may have 200-500ms latency — skeleton masks this |
| Testing surface doubles | Progressive and standalone modes share the same page models and components. Only the wrapper needs new tests |
| Deep linking breaks | Standalone routes preserved. All existing links to /evidence, /trust, /resolve continue to work |
| Scroll position on collapse | When a section collapses, scroll position is maintained. Browser handles this natively |

---

## Effort estimate

| Phase | Days | Detail |
|---|---|---|
| ProgressiveSection component | 1 | Expand/collapse, hash sync, lazy loading, skeleton, error state |
| EvidenceContent | 1 | Wrap evidence page model, render in progressive section |
| TrustContent + ResolveContent | 1 | Same pattern for trust and resolve |
| Homepage integration | 0.5 | Add sections below decision card |
| Navigation update | 0.5 | Update Deepen link, global header |
| SEO fallback | 0.5 | Canonical URLs on standalone pages |
| Testing | 1 | Progressive + standalone mode tests, hash navigation tests |
| **Total** | **5.5 days** | |

---

## What this enables

Once the progressive sections exist, the "Explore scenarios" collapsible (currently holding the simulator, trendline, transition probability, company metrics, and source disagreement) can be redistributed into their natural homes:
- Simulator + transition probability → evidence section ("What would change?")
- Company metrics + trendline → trust section ("How does this affect me?")
- Source disagreement → evidence section ("Why might this be wrong?")

The product becomes one page with layered depth — scroll to skim, expand to understand, click through to act. The standalone routes remain as entry points, but the primary experience is a single artifact.
