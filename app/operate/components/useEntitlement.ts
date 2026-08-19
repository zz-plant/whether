"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { STORAGE_KEYS } from "../../../lib/storage/keys";

export type EntitlementState = {
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
  const [state, setState] = useState<EntitlementState>({ ready: false, active: false });

  const checkoutStatus = searchParams?.get("checkout");
  const sessionId = searchParams?.get("session_id");

  useEffect(() => {
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
          setState({ ready: true, active: true, plan: data.plan });
        } else {
          clearToken();
          setState({ ready: true, active: false });
        }
      } catch {
        if (!cancelled) setState({ ready: true, active: false });
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
            setState({ ready: true, active: true, plan: data.plan });
            return;
          }
          break;
        } catch {
          break;
        }
      }
      if (!cancelled) setState({ ready: true, active: false });
    };

    if (checkoutStatus === "success" && sessionId) {
      void confirm(sessionId);
      return () => { cancelled = true; };
    }

    const stored = readStoredToken();
    if (stored) {
      void verify(stored);
    } else {
      setState({ ready: true, active: false });
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the checkout redirect params change
  }, [checkoutStatus, sessionId]);

  return state;
}
