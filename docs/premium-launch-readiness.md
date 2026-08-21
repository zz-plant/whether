# Premium offering launch readiness (pre-reveal)

This checklist covers the minimum instrumentation and product plumbing to put in place **before** publicly announcing premium availability.

Status note: billing is backend-heavy pre-reveal plumbing only. The repo has checkout, webhook, and telemetry support, but no first-class customer-facing pricing or paywall surface is shipped yet.

Capture status (2026-08-21): funnel events are persisted durably by default. Until this date the
only sink was `PREMIUM_FUNNEL_WEBHOOK_URL`, which has never been set in any environment, so every
production event was silently discarded and the go/no-go checks below could not pass no matter how
long they ran. Treat the event history as starting 2026-08-21, not at first deploy.

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
  dashboards, no longer the only sink.
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

## Pre-reveal go/no-go checks
1. Confirm event volume for at least 1–2 weeks on free traffic.
2. Validate `source` distribution lines up with product thesis (exports/integrations should dominate).
Known gap: the tags on `app/components/shareRail.tsx` currently capture nothing, because the global
share rail cannot open — `app/components/commandPalette.tsx` dispatches `whether-open-share-rail` as
a non-bubbling `CustomEvent` on `document`, while `app/components/globalShareRail.tsx` listens on
`window`, so the event never arrives. The tags are correct and will produce data once that is fixed;
do not count them as live coverage until then.

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
- Add explicit `premium_gate_view` events on prototype gate modals or locked actions.
- Add explicit checkout entry CTAs from gated product actions into `/api/billing/checkout`.
- Set dashboard alerts for funnel-drop regressions week-over-week.
