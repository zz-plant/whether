"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STORAGE_KEYS } from "../../../lib/storage/keys";
import { createBrowserSource, useBrowserSource, useHydrated } from "../../components/browserSource";

type EntitlementState = {
  /** True once the confirm/status round trip has resolved (success or not). */
  ready: boolean;
  active: boolean;
  plan?: "pro" | "team";
};

const CONFIRM_RETRY_DELAYS_MS = [1000, 2000, 4000]; // webhook vs. redirect race

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.entitlementToken);
  } catch {
    return null;
  }
};

const storeToken = (token: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.entitlementToken, token);
  } catch { /* private browsing / storage disabled */ }
};

const clearToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.entitlementToken);
  } catch { /* ignore */ }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* Read through a store, so "this browser has no token" is an answer the render
   already has rather than one an effect assigns. It is also the difference the
   server cannot see: null before hydration means "not read yet", and `hydrated`
   is what tells the two apart. */
const storedTokenSource = createBrowserSource<string | null>({
  read: readStoredToken,
  serverValue: null,
  refreshOnSubscribe: true,
});

/** Nothing outstanding: no token to verify and no checkout to confirm. */
const NOT_ENTITLED: EntitlementState = { ready: true, active: false };
const UNRESOLVED: EntitlementState = { ready: false, active: false };

/**
 * Resolves whether this browser holds an active premium entitlement.
 *
 * Two paths converge on the same token:
 * 1. Just returned from Stripe checkout (?checkout=success&session_id=...) —
 *    exchange the session id for a token via /api/billing/confirm, retrying a
 *    few times since the webhook that persists the entitlement can land after
 *    the redirect.
 * 2. A token already sits in localStorage from a prior visit — re-verify it
 *    with /api/billing/status rather than trusting it blindly, since a
 *    cancellation flips the underlying record without touching the token.
 */
export function useEntitlement(): EntitlementState {
  const searchParams = useSearchParams();
  const [resolved, setResolved] = useState<EntitlementState | null>(null);
  const hydrated = useHydrated();
  const storedToken = useBrowserSource(storedTokenSource);

  const checkoutStatus = searchParams?.get("checkout");
  const sessionId = searchParams?.get("session_id");

  /* The only two states that need the network. Everything else — no token, no
     checkout — is settled here, which is why the effect below has no branch
     that assigns state without having waited for something. */
  const returningFromCheckout = checkoutStatus === "success" && Boolean(sessionId);
  const awaitingRoundTrip = returningFromCheckout || Boolean(storedToken);

  useEffect(() => {
    if (!awaitingRoundTrip) return;
    let cancelled = false;

    const verify = async (token: string) => {
      try {
        const res = await fetch("/api/billing/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.active) {
          setResolved({ ready: true, active: true, plan: data.plan });
        } else {
          clearToken();
          setResolved(NOT_ENTITLED);
        }
      } catch {
        if (!cancelled) setResolved(NOT_ENTITLED);
      }
    };

    const confirm = async (id: string) => {
      for (const delay of [0, ...CONFIRM_RETRY_DELAYS_MS]) {
        if (delay) await sleep(delay);
        if (cancelled) return;
        try {
          const res = await fetch("/api/billing/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: id }),
          });
          if (res.status === 404) continue; // webhook hasn't landed yet
          const data = await res.json();
          if (cancelled) return;
          if (data.ok && data.token) {
            storeToken(data.token);
            setResolved({ ready: true, active: true, plan: data.plan });
            return;
          }
          break;
        } catch {
          break;
        }
      }
      if (!cancelled) setResolved(NOT_ENTITLED);
    };

    if (returningFromCheckout && sessionId) {
      void confirm(sessionId);
    } else if (storedToken) {
      void verify(storedToken);
    }

    return () => { cancelled = true; };
  }, [awaitingRoundTrip, returningFromCheckout, sessionId, storedToken]);

  if (resolved) return resolved;
  // Before hydration the browser has not been read, so "no token" is not yet a
  // fact about this browser — only about the server's render.
  return hydrated && !awaitingRoundTrip ? NOT_ENTITLED : UNRESOLVED;
}
