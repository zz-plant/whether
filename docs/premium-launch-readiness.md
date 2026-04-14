# Premium offering launch readiness (pre-reveal)

This checklist covers the minimum instrumentation and product plumbing to put in place **before** publicly announcing premium availability.

Status note: billing is backend-heavy pre-reveal plumbing only. The repo has checkout, webhook, and telemetry support, but no first-class customer-facing pricing or paywall surface is shipped yet.

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
- Forwards accepted events to `PREMIUM_FUNNEL_WEBHOOK_URL` when configured.
- Falls back to structured server logs when webhook is not configured.

### 3b) Stripe webhook conversion capture
- `POST /api/billing/webhook`
- Verifies Stripe signatures with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed`, emits `premium_checkout_complete` when metadata includes valid `source` attribution.
- Carries optional `planCandidate` and `seatBand` metadata through conversion telemetry.

### 4) Initial premium-intent instrumentation on high-value surfaces
- Export brief actions (copy Slack/board, export PDF).
- Runway planner copy action.
- Operations workflow navigation into integrations/data stages.

## Pre-reveal go/no-go checks
1. Confirm event volume for at least 1–2 weeks on free traffic.
2. Validate `source` distribution lines up with product thesis (exports/integrations should dominate).
3. Establish baseline conversion denominator:
   - unique weekly brief sessions
   - unique premium-intent sessions
4. Define initial paywall trigger based on observed intent concentration.
5. Verify webhook receiver SLA and error handling before paid rollout.

## Recommended next steps before public premium reveal
- Add explicit `premium_gate_view` events on prototype gate modals or locked actions.
- Add explicit checkout entry CTAs from gated product actions into `/api/billing/checkout`.
- Set dashboard alerts for funnel-drop regressions week-over-week.
