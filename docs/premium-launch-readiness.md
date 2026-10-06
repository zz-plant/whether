# Premium offering launch readiness (pre-reveal)

This checklist covers the minimum instrumentation and product plumbing to put in place **before** publicly announcing premium availability.

Status note (updated 2026-08-29): billing is still pre-reveal plumbing — nothing in `app/` calls
`POST /api/billing/checkout`, which remains the intended state. What changed is that the offer is now
stated: `/pricing` publishes real prices (Pro $49/mo, Team $199/mo, source of truth `lib/pricing.ts`)
and says in as many words that the paid plans are not buyable yet. Its CTA registers interest under
the `pricing_page` intent source rather than starting a checkout.

That separation is the point. The five feature-located intent sources record someone wanting a
capability; `pricing_page` records someone wanting it *after seeing what it costs*. Only the second
speaks to willingness to pay, and the go/no-go below should weight it accordingly — a strong
ungated-intent signal with no priced intent behind it is curiosity, not demand.

The free tier is now a written promise (`FREE_FOREVER_PROMISE`): the weekly call, the API, MCP, and
embeds are free permanently, and paid packages continuity and team ritual rather than access to the
call. Treat that as load-bearing rather than as copy — it is asserted in `tests/pricing.test.ts`
because walking it back later would cost more than any plan it could sell.

Return path (resolved 2026-08-29): the checkout return URL defaulted to `/pricing` before that page
existed, so any session created without an explicit `returnPath` sent the customer to a 404 on both
success and cancel. It was parked on `/operate`; now that the page ships, `CHECKOUT_RETURN_PATH` in
`lib/billingStripe.ts` points back at `/pricing`. `tests/billingStripe.test.ts` checks the constant
against the routes on disk, so it cannot drift into a 404 again.

Capture status (2026-08-21): funnel events are persisted durably by default. Until this date the
only sink was `PREMIUM_FUNNEL_WEBHOOK_URL`, which has never been set in any environment, so every
production event was silently discarded and the go/no-go checks below could not pass no matter how
long they ran. Treat the event history as starting 2026-08-21, not at first deploy.

## Activation precedes premium

`lib/activationFunnel.ts` defines the funnel this document's premium-intent numbers should be read
against: **visited → oriented → committed → returned**, where `returned` means the same browser came
back in a later ISO week.

The reason this matters here: premium intent measured on a base of visitors who never come back is
measuring interest in an article, not demand for a subscription. For a weekly-ritual product, the
week-2 return rate is the denominator that makes every intent number interpretable, and until this
existed nothing recorded it.

- **Instrumented at:** `ActivationTracker` on `/` (visited, returned, and oriented on the first
  control pressed, section opened or link followed in a visit), `/share`'s format picker
  (`app/share/sharePageFormats.tsx`) and `SubscribeForm` (committed).
- **Sink:** `POST /api/telemetry/activation` → the `activation` analytics stream.
- **Identity:** none. Return detection reads one localStorage key holding an ISO week slug and
  reports a bucketed gap (`same_week` / `next_week` / `within_month` / `lapsed`). No id, no cookie,
  nothing joinable to a person — the product advertises no trackers and the measurement is built to
  keep that true rather than to be maximally informative.
- **Read it as:** a weekly readout on the same cadence as the product. A `committed` rate that rises
  while `returned` stays flat is a sharing product, not a ritual product, and would change what
  premium should package.

Entitlement rail (added Aug 2026, rebased Sep 2026): the plumbing *behind* a paid plan now exists end
to end — `checkout.session.completed` persists an entitlement, `POST /api/billing/confirm` and
`/status` issue and re-verify a signed token, and `PremiumGate` can wrap a surface. It is wired but
not exposed: `PremiumGate` renders its children ungated while `lib/pricing.ts` says the paid plans
are not buyable, so the gate and the pricing page cannot disagree. Section 5 below describes the
rail; flipping `PAID_PLANS_ON_SALE` is what turns it on.

## Goals
- Preserve the free weekly posture ritual (`/`) as the acquisition and trust surface.
- Measure where users hit premium intent (exports, integrations, API/data, planning depth).
- Keep premium rollout reversible with server-side forwarding and no checkout hard dependency.

## Implemented baseline

### 0) Billing substrate ready (Stripe)
- `POST /api/billing/checkout` now creates Stripe Checkout sessions for premium plans and emits `premium_checkout_start` telemetry on successful session creation.
- Request payload supports `plan` (`pro` | `team`) with required attribution `source` plus optional `customerEmail` and `returnPath`.
- Env vars required for readiness:
  - `STRIPE_SECRET_KEY`
  - `APP_BASE_URL`
  - `STRIPE_PRICE_PRO_MONTHLY`
  - `STRIPE_PRICE_TEAM_MONTHLY`
- Optional request header: `Idempotency-Key` (recommended for safe retries).

Source of truth: `lib/billingStripe.ts`, `app/api/billing/checkout/route.ts`.

### 1) Premium intent telemetry event contract
- Shared event types: `premium_intent`, `premium_gate_view`, `premium_checkout_start`, `premium_checkout_complete`.
- Shared intent sources: `export_brief`, `runway_planner`, `integrations`, `api_access`, `team_workflow`.
- Shared payload fields: `type`, `source`, `path`, `ctaId`, `detail`, `planCandidate`, `seatBand`, `occurredAt`.

Source of truth: `lib/premiumFunnel.ts`.

### 2) Client-side click capture for premium-intent elements
- `app/components/premiumFunnelTracker.tsx` listens for clicks on elements carrying:
  - `data-premium-intent`
  - optional `data-premium-cta`
  - optional `data-premium-event-type`
  - optional `data-premium-detail`
- Sends events via `navigator.sendBeacon` to `/api/telemetry/premium-funnel`.

### 3) API endpoint for funnel intake and forwarding
- `POST /api/telemetry/premium-funnel`
- Validates source + type before accepting payloads.
- Persists every accepted event to KV (`lib/storage/premiumFunnelEventRepository.ts`, key prefix
  `premium-funnel:`, binding `WHETHER_DURABLE_KV`, in-memory fallback when unbound). Each event gets
  a collision-free key (inverted timestamp + UUID) rather than a shared index counter, so concurrent
  writers in different isolates cannot overwrite each other. Entries expire after 180 days.
- Abuse posture: the intake is public by necessity (browser telemetry). Request bodies are capped at
  4 KB and every free-text field is length-bounded, so a caller cannot write large KV values.
  **Request-rate limiting is not implemented in app code** and belongs at the WAF/CDN layer — add a
  Cloudflare rate-limiting rule on `POST /api/telemetry/premium-funnel` before treating volume
  figures as decision-grade, since an unthrottled caller can still inflate counts.
- Additionally forwards to `PREMIUM_FUNNEL_WEBHOOK_URL` when configured — a mirror for external
  dashboards, no longer the only sink. The forward is bounded at 3s, because the checkout route
  awaits it before handing the reader their Stripe link.
- `GET /api/telemetry/premium-funnel` reads the data back (aggregate by default, `?events=1` for the
  raw tail). Authorized with the cron secret; `?limit=` caps the scan window at 1000.

### 3b) Stripe webhook conversion capture
- `POST /api/billing/webhook`
- Verifies Stripe signatures with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed`, emits `premium_checkout_complete` when metadata includes valid `source` attribution.
- Carries optional `planCandidate` and `seatBand` metadata through conversion telemetry.

### 4) Premium-intent instrumentation on high-value surfaces
All five declared intent sources now have at least one instrumented element. The tracker mounts in
the root layout, but note that mounting alone measures nothing — the listener only fires on elements
carrying `data-premium-intent`, so a surface is measured only if something on it is tagged:

| Source | Where |
| --- | --- |
| `export_brief` | `app/components/shareBriefButton.tsx` — **the only tagged control that renders on `/`** · `app/components/shareRail.tsx` — copy plain/Slack/decision-card (see caveat below) · `app/operate/components/exportBriefPanel.tsx` — copy Slack/board/explainer, export PDF |
| `runway_planner` | `app/operate/components/runwayPlannerPanel.tsx` — copy financial block |
| `api_access` | `app/api-docs/page.tsx` — the five endpoint try-it links |
| `integrations` | `app/components/regimeAlertsPanel.tsx` — Slack/email/webhook channel toggles |
| `team_workflow` | `app/operate/components/decisionMemoryPanel.tsx` — export CSV, copy latest JSON |

### 5) Entitlement persistence and gating
- `checkout.session.completed` now persists an `EntitlementRecord` (plan, Stripe
  customer id, email, status) to KV, keyed by session id, email, and customer
  id. `customer.subscription.deleted` flips it to `cancelled` in place —
  entitlements are never deleted, only closed.
- The success redirect carries `session_id={CHECKOUT_SESSION_ID}` (a literal
  Stripe template, substituted at redirect time). `POST /api/billing/confirm`
  exchanges that id for a signed entitlement token once the webhook has landed
  (the client retries briefly — checkout and webhook race). `POST
  /api/billing/status` re-verifies a stored token against the live record, so
  a cancellation closes access before the token's own TTL would.
- Tokens are HMAC-SHA256 (WebCrypto) under `WHETHER_ENTITLEMENT_SECRET`. Unset,
  issuing and verifying both refuse outright rather than mint or accept an
  unverifiable token — there is no silent bypass mode.
- `app/operate/components/PremiumGate.tsx` is the first real gate: it wraps
  `/operate`'s Runway planner, defaults to locked (including the first
  server-rendered paint, before any client check has run), and offers
  Pro/Team checkout inline. No other premium-intent surface is gated yet —
  export/copy on the weekly brief stays free, matching the product's stance
  that the core artifact must always be copyable.

Env var to add to the readiness list above: `WHETHER_ENTITLEMENT_SECRET`.

Source of truth: `lib/billing/entitlements.ts`, `app/api/billing/confirm/route.ts`,
`app/api/billing/status/route.ts`, `app/operate/components/PremiumGate.tsx`.

## Pre-reveal go/no-go checks
1. Confirm event volume for at least 1–2 weeks on free traffic.
2. Validate `source` distribution lines up with product thesis (exports/integrations should dominate).
Resolved (Aug 2026): the tags on `app/components/shareRail.tsx` are now live. The global share rail
had been unreachable — `app/components/commandPalette.tsx` dispatches `whether-open-share-rail` as a
non-bubbling `CustomEvent` on `document`, while `app/components/globalShareRail.tsx` listened on
`window`, so the event never arrived. The same defect also broke ⌘K
(`app/components/globalCommandPalette.tsx`), which is the rail's only entry point. Both listeners now
bind to `document`, and `tests/customEventTargetContract.test.ts` fails if any `whether` event is
dispatched somewhere its listener cannot hear it. Export-brief coverage starts from the deploy that
carries this fix, so earlier weeks have no share-rail data to compare against.

3. Establish baseline conversion denominator:
   - unique premium-intent sessions — **available**, from the events captured here
   - unique weekly brief sessions — **still unavailable**. The tracker is click-driven and emits no
     page-view or session event, so a homepage visit that never clicks a tagged control produces no
     row. Sizing the denominator needs a separate view/session signal, and the cheap version (one KV
     write per homepage visit) is the wrong trade — prefer sampling or a daily bucket. Until that
     exists, conversion *rate* cannot be computed; only intent volume and its source mix can.
4. Define initial paywall trigger based on observed intent concentration.
5. Verify webhook receiver SLA and error handling before paid rollout.

## Recommended next steps before public premium reveal
- Fire an explicit `premium_gate_view` event when `PremiumGate` renders locked
  (currently only the checkout-click CTAs are instrumented, via the existing
  click-delegated tracker; a view-on-render event needs its own dispatch).
- Decide whether additional premium-intent surfaces (`export_brief`,
  `integrations`, `api_access`, `team_workflow`) actually get gated, or stay
  free with intent-only tracking — `export_brief` in particular should stay
  free per the product's artifact-quality rule (AGENTS.md hard rule 3) unless
  that stance changes deliberately.
- Set dashboard alerts for funnel-drop regressions week-over-week.
- Build a real `/pricing` page; `PremiumGate`'s inline Pro/Team buttons are a
  functional stopgap, not a comparison page.
