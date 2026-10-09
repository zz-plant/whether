"use client";

import { useState } from "react";
import type { PremiumIntentSource } from "../../../lib/premiumFunnel";
import { PAID_PLANS_ON_SALE } from "../../../lib/pricing";
import { useEntitlement } from "./useEntitlement";

/**
 * Gates a panel behind an active Stripe entitlement.
 *
 * The checkout funnel (checkout → webhook → this gate) previously ended at the
 * webhook: nothing persisted a subscription and nothing ever read one, so a
 * completed payment changed nothing for the buyer. This is the read side of
 * that loop.
 *
 * Defaults to locked. The entitlement check is inherently client-side and
 * async, so rendering the gated state first — including on the server, before
 * any verification has run — means a slow or failed check fails closed rather
 * than briefly exposing the panel.
 */
type PremiumGateProps = {
  source: PremiumIntentSource;
  title: string;
  description: string;
  children: React.ReactNode;
};

/*
 * The gate cannot sell what /pricing says is not for sale, and while it cannot,
 * it asks nothing.
 *
 * This branch used to sit below `useEntitlement()`, which hooks require — so
 * every visitor to Planning with a stored token spent a round trip to
 * /api/billing/status computing a value the next line discarded. Splitting the
 * check off means the request is made only when its answer can change what is
 * rendered. `PAID_PLANS_ON_SALE` is a module constant, so which component
 * renders is fixed at build time and no hook order moves.
 */
export function PremiumGate(props: PremiumGateProps) {
  if (!PAID_PLANS_ON_SALE) {
    return <>{props.children}</>;
  }

  return <EntitlementGate {...props} />;
}

function EntitlementGate({ source, title, description, children }: PremiumGateProps) {
  const entitlement = useEntitlement();
  const [pending, setPending] = useState<"pro" | "team" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (entitlement.active) {
    return <>{children}</>;
  }

  const startCheckout = async (plan: "pro" | "team") => {
    setPending(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, source }),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error === "billing_not_configured" ? "Billing isn't set up yet." : "Couldn't start checkout.");
    } catch {
      setError("Couldn't start checkout.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-950/30 px-5 py-6 text-center"
      data-premium-intent={source}
    >
      {/* The plan is a stamp on the title's line, not a kicker above it. */}
      <p className="text-sm font-semibold text-slate-100">
        {title} <span className="type-badge rounded-sm border border-sky-400/40 px-1.5 py-0.5 align-middle text-sky-200">Pro</span>
      </p>
      <p className="mx-auto max-w-sm text-fluid-xs text-slate-400">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          type="button"
          data-premium-cta="unlock_pro"
          onClick={() => void startCheckout("pro")}
          disabled={pending !== null}
          className="min-h-11 rounded-lg bg-sky-500/90 px-4 text-fluid-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {pending === "pro" ? "Starting…" : "Unlock with Pro"}
        </button>
        <button
          type="button"
          data-premium-cta="unlock_team"
          onClick={() => void startCheckout("team")}
          disabled={pending !== null}
          className="min-h-11 rounded-lg border border-slate-700/70 px-4 text-fluid-xs font-medium text-slate-300 transition-colors hover:border-slate-600 disabled:opacity-60"
        >
          {pending === "team" ? "Starting…" : "Unlock with Team"}
        </button>
      </div>
      {error ? <p className="text-fluid-nano text-rose-300">{error}</p> : null}
      {!entitlement.ready ? (
        <p className="text-fluid-nano text-slate-500">Already subscribed? Checking your plan…</p>
      ) : null}
    </div>
  );
}
