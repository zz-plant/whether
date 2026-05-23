# Big-feature plans — May 2026

Each plan: what changes, technical approach, dependencies, risks, effort.

---

## 6. Weekly email digest

**What changes**: The product goes from pull (user must visit) to push (product finds user). Monday morning email with the call, action, guidance, and one-click share link. The site becomes the archive; the email becomes the ritual.

**Technical approach**:
- Email service: Resend (simplest API, good React email support) or Cloudflare Email Routing
- Template: `react-email` component matching the memo format — From/Date/Re header, operating call, action now, pause if, flip if, citation
- Scheduling: Cloudflare Cron Trigger hitting `GET /api/cron/weekly-digest` which loads the current brief, renders the template, and sends to all subscribed recipients
- Subscription: email input on `/` and `/trust` → writes to D1 table `subscribers(email, verified_at, unsubscribed_at)`
- Unsubscribe: one-click link in every email → `GET /api/unsubscribe?token=...`
- Preview: `/api/preview/weekly-digest` renders the email in-browser for testing

**Files to create**: `app/api/cron/weekly-digest/route.ts`, `app/api/subscribe/route.ts`, `app/api/unsubscribe/route.ts`, `app/emails/weekly-brief.tsx`, D1 migration for subscribers table

**Files to modify**: `app/page.tsx` (add email input), `app/trust/page.tsx` (add email input), `wrangler.toml` (add cron trigger + D1 binding)

**Dependencies**: Resend SDK, `react-email`, D1 binding in wrangler config

**Risks**: Deliverability (need SPF/DKIM/DMARC for custom domain), unsubscribe compliance (CAN-SPAM), content freshness (email sends at 8am but data refreshes at 9am — need to align schedules)

**Effort**: 3-5 days. Email service + template (1 day), subscription flow (1 day), cron + rendering (1 day), testing + deliverability (1-2 days).

---

## 7. Flip condition monitoring

**What changes**: The hero says "Pause if tightness crosses 74." The user can toggle "Alert me." An edge function polls the treasury data on schedule and sends a notification when the threshold is crossed. Transforms the product from weekly to continuous.

**Technical approach**:
- Alert preferences: store in a cookie or D1 row per subscriber. User picks which condition to watch (tightness, risk appetite, or both) and threshold
- Monitoring: Cloudflare Cron (every 15 min) → `GET /api/cron/check-thresholds` → loads current treasury data, evaluates against all active alerts, sends email or in-app notification
- In-app notification: toast or banner on next page visit. Store in cookie `whether_alert_pending` → Banner component reads on load
- UI: toggle on the decision strip next to each condition: "Pause if tightness crosses 74 [🔔 Alert me]"

**Files to create**: `app/api/cron/check-thresholds/route.ts`, `app/components/home/AlertToggle.tsx`, `app/components/AlertBanner.tsx`

**Files to modify**: `BriefHero.tsx` (add alert toggles), `wrangler.toml` (cron), D1 migration

**Dependencies**: D1 for persistent alerts, Resend for email delivery

**Risks**: False positives (data flickers near threshold), alert fatigue (too many notifications), threshold precision (the real threshold is a state machine with hysteresis, not a single number)

**Effort**: 3-4 days. Alert preferences + toggle UI (1 day), cron monitoring (1 day), notification delivery (1 day), edge cases (1 day).

---

## 8. Company metrics overlay

**What changes**: A single panel where users input their burn rate, runway months, and headcount. The product computes personalized implications: "At $85K burn with 14 months runway, tighten to $65K to extend to 18 months." No external data needed — pure math on user-provided numbers.

**Technical approach**:
- Input panel: client component with 3 fields (burn rate $/month, runway months, headcount). Stored in localStorage + cookie for server access
- Computation: server-side function that maps macro tightness to recommended burn adjustment. High tightness → reduce burn by X%. Low tightness → maintain or expand
- Display: inline in the "What to adjust" guidance section. "Based on your $85K burn and 14-month runway: reduce to $65K/month to extend runway to 18 months under current conditions."
- Stage-aware defaults: pre-seed burn = $40K, Series A = $150K, etc. Pre-fill based on company stage

**Files to create**: `app/components/home/CompanyMetricsInput.tsx`, `lib/report/companyMetrics.ts`

**Files to modify**: `BriefHero.tsx` (add metrics display in guidance), `app/page.tsx` (pass metrics)

**Dependencies**: None (purely local computation)

**Risks**: Users may misinterpret the recommendations as financial advice, the model is simplistic (linear burn adjustment based on tightness), input values persist only in localStorage

**Effort**: 2-3 days. Computation model (0.5 day), input panel (0.5 day), guidance integration (0.5 day), edge cases and disclaimers (0.5-1 day).

---

## 9. Role-based views

**What changes**: Instead of one decision card for everyone, three variants: CEO (call + board summary), CFO (cash timing + runway), VP Eng (hiring + roadmap). The stage selector already exists — extend it to include role. Same data model, three presentations.

**Technical approach**:
- Role selector: extend `operatorContext` (currently has `companyStage` and `rateSensitivity`) to include `role: "ceo" | "cfo" | "vp-engineering" | "default"`
- View variants: three render functions in the memo component that emphasize different data. CEO: operating call + confidence + flip conditions. CFO: tightness + risk appetite + runway implications + guardrail thresholds. VP Eng: hiring guidance + roadmap impact + action strip items
- Implementation: conditional rendering within `CallModeSections.tsx` based on `selectedRole`. No new components — just different section ordering and emphasis
- Storage: cookie + URL param (`?role=cfo`)

**Files to modify**: `CallModeSections.tsx` (add role variants), `callModePanelModel.ts` (add role-aware selectors), `app/page.tsx` (pass role), `operatorContext.ts` (add role field)

**Files to create**: None — all changes are conditional rendering in existing components

**Dependencies**: None

**Risks**: Maintaining three variants doubles the test surface, role labels may not map cleanly to all company stages (a pre-seed company doesn't have a CFO)

**Effort**: 2-3 days. Role selector UI (0.5 day), three view variants (1 day), testing all variants (0.5-1 day).

---

## 10. Meeting agenda export

**What changes**: One-click "Add to board packet" that generates a formatted one-pager: call, 3-bullet evidence summary, action items, citation, and a "discussion questions" section. Formatted for printing or pasting into a slide deck.

**Technical approach**:
- Export page: `/export/board-packet?date=2026-05-22` renders a print-optimized single page
- Content: pulls from the same data as the memo format but restructured for a board audience — shorter, more decisive, with explicit "Questions for discussion" at the bottom
- Print: uses the existing print stylesheet, optimized for this specific page
- Download: "Download PDF" button triggers `window.print()` or uses a server-side PDF generator
- Integration: link from the planning page's export section and the homepage "Share" CTA area

**Files to create**: `app/export/board-packet/page.tsx`, `app/export/board-packet/boardPacketModel.ts`

**Files to modify**: None required — standalone export page

**Dependencies**: None (uses existing data loaders)

**Risks**: Duplicating content that already exists in the memo/export panel, board expectations vary by company stage

**Effort**: 2 days. Page model + data loading (1 day), layout + styling (0.5 day), print optimization (0.5 day).

---

## 11. Decision velocity dashboard

**What changes**: A stats panel on `/history` that answers: how often does the call change? How long do regimes last? What's the average time between posture shifts? Uses the time machine data to compute historical patterns and display them as compact stat cards.

**Technical approach**:
- Data: `getTimeMachineRegimeSeries()` returns monthly regime entries. Compute: regime durations (consecutive months in same regime), transition frequency (regime changes per year), average call duration
- Display: 3-4 stat cards in a row below the regime timeline: "Average regime duration: 4.2 months," "Transitions per year: 2.8," "Longest Scarcity streak: 14 months (Mar–Jun 2025)"
- Trend sparkline: small inline chart showing regime changes over the last 24 months with colored bands

**Files to create**: `app/components/history/RegimeStats.tsx`

**Files to modify**: `app/history/page.tsx` (add stats section)

**Dependencies**: None (uses existing time machine data)

**Risks**: Small sample size in early months produces misleading averages, regime transitions have hysteresis (state machine requires confirmation) so direct counts may not match user expectations

**Effort**: 1-2 days. Computation logic (0.5 day), stat cards (0.5 day), integration (0.5 day).

---

## 12. Audio brief

**What changes**: A "Listen (60s)" button that reads the operating call + action + guidance as spoken audio. Captures the commute/driving/listening audience. No visual changes required — just an audio player component.

**Technical approach**:
- TTS: OpenAI TTS API (`tts-1` model, "alloy" voice) or ElevenLabs. Call from an edge function route
- Caching: generate once per week, cache the audio blob in R2 or KV for 7 days. Subsequent requests serve the cached audio instantly
- Player: a small `<audio>` player component with play/pause and a progress bar. Shows "Listening time: ~60s"
- Trigger: "Listen (60s)" button in the hero area, next to "Copy brief" and "Copy as image"
- Content: `${operatingCall}. ${actionNow}. Pause if ${guardrail}. Flip if ${flipConditions}. Confidence is ${confidenceLabel}. whether.work.`

**Files to create**: `app/api/audio/brief/route.ts`, `app/components/AudioPlayer.tsx`

**Files to modify**: `app/page.tsx` (add audio button)

**Dependencies**: OpenAI SDK (or ElevenLabs), R2 bucket for caching

**Risks**: TTS API cost ($0.015/1K chars ≈ $0.01 per generation), voice quality varies, caching invalidation when the brief updates mid-week

**Effort**: 2-3 days. TTS integration + caching (1 day), audio player (0.5 day), UX polish (0.5 day), cost estimation + throttle (0.5 day).

---

## 13. Single-page progressive disclosure

**What changes**: The most radical structural change. `/evidence`, `/trust`, and `/resolve` become expandable sections on `/` instead of separate routes. Click "Why this call" → evidence expands inline. Click "Is this reliable?" → trust dashboard slides open. Click "Have a question?" → resolve tools appear. The product becomes one page with depth, not a site with breadth.

**Technical approach**:
- URL state: use hash fragments (`/#evidence`, `/#trust`, `/#resolve`) to control which sections are expanded. The URL is shareable and back-button-safe
- Progressive loading: each section loads its data lazily — only when expanded. Use Suspense boundaries with skeleton fallbacks
- ReportShell adaptation: the shell currently assumes separate routes for each page. Add a `progressiveMode` prop that renders sections inline instead of as route children
- Navigation: the 3-step nav (Decide/Plan/Deepen) would still work but Deepen now scrolls to the expanded section instead of navigating to a new route
- Page models: each section's data loading (`buildSignalsPageModel`, `buildTrustPageModel`, `buildResolvePageModel`) becomes a lazy-loaded function called when the section expands
- Fallback: if JS is disabled, the old separate routes still work as standalone pages

**Files to create**: `app/components/home/ProgressiveSection.tsx` (wrapper with expand/collapse + Suspense), `app/components/home/EvidenceSection.tsx`, `app/components/home/TrustSection.tsx`, `app/components/home/ResolveSection.tsx`

**Files to modify**: `ReportShell.tsx` (add progressiveMode), `app/page.tsx` (integrate sections), `globalHeaderNavClient.tsx` (update deep links), route files (keep as standalone fallbacks)

**Dependencies**: None (pure frontend restructure)

**Risks**: SEO impact (3 routes disappear from sitemap — need 301 redirects or keep static versions), bundle size (lazy loading mitigates), URL state complexity (hash management across expand/collapse), testing surface doubles (need to test both progressive and standalone modes)

**Effort**: 5-8 days. Progressive section wrapper (1 day), evidence section integration (1 day), trust section integration (1 day), resolve section integration (1 day), URL state + navigation updates (1 day), standalone fallback preservation (1 day), testing both modes (1-2 days).

---

## 14. Cross-reference internal metrics

**What changes**: Connect the user's actual financial data (Stripe, QuickBooks, HubSpot) to the macro backdrop. "Your MRR growth is 8% while the macro backdrop suggests 4% is normal for your stage." The product becomes a benchmark, not just a report.

**Technical approach**:
- OAuth flow: "Connect Stripe" / "Connect QuickBooks" button → OAuth redirect → store access token in D1 (encrypted)
- Metric extraction: edge function pulls key metrics (MRR, burn, runway, headcount) from the connected service's API
- Comparison: server-side function compares user metrics against macro-implied benchmarks. "Your burn is 15% above the stage-adjusted median for current tightness conditions."
- Display: a "Your numbers" card on the homepage that shows 2-3 key comparisons
- Privacy: all data stays in the user's D1 row. No aggregation, no benchmarking pool. Explicitly NOT collecting data across users

**Files to create**: `app/api/connect/stripe/route.ts`, `app/api/connect/quickbooks/route.ts`, `app/api/metrics/route.ts`, `lib/metrics/comparison.ts`, `app/components/home/MetricsComparison.tsx`, D1 migration for connected accounts

**Files to modify**: `app/page.tsx` (add metrics card), `app/trust/page.tsx` (add connect buttons)

**Dependencies**: Stripe Connect OAuth, QuickBooks OAuth, D1 encrypted storage

**Risks**: OAuth complexity (each provider has different scopes and rate limits), data staleness (metrics pulled once, not real-time), privacy concerns (users must trust the product with financial data), scope creep (each new integration doubles maintenance)

**Effort**: 2-3 weeks. OAuth flow for one provider (3 days), metric extraction (2 days), comparison model (2 days), display component (1 day), second provider (3 days), testing + security review (3 days).

---

## 15. Source disagreement visualization

**What changes**: When Treasury says tighten but macro says hold, show a side-by-side diff. "These two inputs disagree. Here's which one is driving the call and why." Like a git diff for data. The product stops asserting authority and starts showing its work.

**Technical approach**:
- Disagreement detection: compare the direction (tightening/easing) implied by treasury data vs macro series. If they point in opposite directions, flag as disagreement
- Data model: the `RegimeAssessment` already has `inputs` showing each input's contribution. Need to add a `disagreement` field computed during regime evaluation
- Visualization: two-column layout. Left: "Treasury says tighten (+3.2 pts)" with the contributing signals. Right: "Macro says hold (-1.1 pts)" with the macro readings. Center: a verdict block explaining which input drove the final call and why
- Integration: appears as a collapsible section on the homepage below the decision card and on the evidence page as a prominent first section. Only renders when disagreement is detected (most weeks it won't appear)

**Files to create**: `app/components/evidence/SourceDisagreement.tsx`, `lib/report/sourceDisagreement.ts`

**Files to modify**: `regimeEngineCore.ts` or `regimeEngineDiagnostics.ts` (add disagreement computation), `app/page.tsx` (add section), `app/evidence/page.tsx` (add section)

**Dependencies**: Changes to the core regime engine (needs careful testing to avoid breaking existing assessments)

**Risks**: Disagreement detection may produce false positives (noisy signals), the visualization could undermine trust if overused (showing disagreement every week makes the product look uncertain), the computation adds complexity to the already-complex regime engine

**Effort**: 3-5 days. Disagreement detection model (1-2 days), visualization component (1 day), integration into homepage + evidence (1 day), testing with historical data (1 day).

---

## 16. Universal design system

**What changes**: One typographic ramp, one color token system, one card template across all 60+ component files. Eliminates the "collection of pages" feel that persists despite 26 features built.

**Technical approach**:
- Typography audit: catalog all font sizes, weights, and line heights across the codebase. Map to a 6-step ramp: `text-display` (hero numbers), `text-heading` (h1/h2), `text-body` (paragraphs), `text-data` (scores/metrics), `text-label` (kickers), `text-caption` (metadata)
- Color audit: catalog all color values. Map to semantic tokens: `color-decision-positive` (emerald for expand/improve), `color-decision-negative` (rose for tighten/warn), `color-decision-neutral` (amber for hold/caution), `color-trust-high`, `color-trust-medium`, `color-trust-low`, plus surface/background/text tokens
- Card template: one `DataCard` component with slots for: label, value, delta, interpretation, source, sparkline. Used everywhere: SensorArray, MacroSignalsPanel, SourceHealthPanel, posture summary cards, decision matrix cells, stat cards
- Implementation: add CSS custom properties to `tokens.css`, create the `DataCard` component, refactor one surface at a time
- Migration: do not break existing pages. Add the new system alongside the old, migrate one component per PR

**Files to create**: `app/components/DataCard.tsx`

**Files to modify**: `tokens.css` (add semantic tokens), then migrate ~15-20 component files incrementally

**Dependencies**: None (pure frontend refactor)

**Risks**: Migration is tedious and error-prone (60+ files), visual regressions are hard to catch without screenshot testing, the design system may not cover all edge cases and require ongoing exceptions

**Effort**: 3-4 weeks. Audit + token design (2-3 days), DataCard component (1 day), incremental component migration (2-3 weeks at 2-3 components per day), visual regression testing throughout.
