/**
 * The browser-native half of an alert this product already sends by email.
 *
 * Renders nothing at all until the server says push is configured and this
 * browser has a service worker: a control that cannot work is worse than no
 * control, and the VAPID keys are an operator action that is set on no
 * developer machine. That is the brief freeze's rule applied to a surface —
 * check the configuration first and say nothing rather than fail when pressed.
 *
 * It asks for permission only when the reader asks for the notification. A
 * permission prompt on page load is the pattern that gets a site's
 * notifications blocked permanently, and a browser that has blocked them is one
 * this control can never recover.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePersistentClientId } from "./clientIdentity";
import { createBrowserSource, useBrowserSource } from "./browserSource";
import { CLIENT_ID_HEADER } from "../../lib/api/clientIdHeader";

const PUSH_ENDPOINT = "/api/push";

type ToggleState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "ready"; subscribed: boolean; publicKey: string }
  | { status: "working"; subscribed: boolean; publicKey: string }
  | { status: "denied" }
  | { status: "failed"; reason: string };

/* Read through a store rather than set from an effect: whether this browser
   can do push at all is a browser value, and `react/set-state-in-effect`
   correctly refuses the mount-effect version of that. The server renders
   `false`, so nothing is offered until hydration proves otherwise. */
const pushSupportSource = createBrowserSource<boolean>({
  read: () =>
    typeof navigator !== "undefined"
    && "serviceWorker" in navigator
    && typeof window !== "undefined"
    && "PushManager" in window,
  serverValue: false,
});

/** base64url → the Uint8Array `pushManager.subscribe` wants. */
const toApplicationServerKey = (base64Url: string): Uint8Array<ArrayBuffer> => {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
  const binary = atob(padded);
  /* Allocated over its own ArrayBuffer so the view's buffer type is exact:
     `pushManager.subscribe` wants a BufferSource, which a Uint8Array over an
     ArrayBufferLike does not satisfy. */
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

export const RegimeAlertToggle = () => {
  const clientId = usePersistentClientId();
  const supported = useBrowserSource(pushSupportSource);
  const [state, setState] = useState<ToggleState>({ status: "loading" });

  useEffect(() => {
    if (!clientId || !supported) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(PUSH_ENDPOINT, { headers: { [CLIENT_ID_HEADER]: clientId }, cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;
        if (!body?.configured || typeof body.publicKey !== "string") {
          setState({ status: "unavailable" });
          return;
        }
        setState({ status: "ready", subscribed: Boolean(body.subscribed), publicKey: body.publicKey });
      } catch {
        if (!cancelled) setState({ status: "unavailable" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, supported]);

  const subscribe = useCallback(
    async (publicKey: string) => {
      if (!clientId) return;
      setState({ status: "working", subscribed: false, publicKey });

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({ status: "denied" });
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toApplicationServerKey(publicKey),
        });

        const response = await fetch(PUSH_ENDPOINT, {
          method: "POST",
          headers: { [CLIENT_ID_HEADER]: clientId, "content-type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error("not stored");

        setState({ status: "ready", subscribed: true, publicKey });
      } catch {
        setState({ status: "failed", reason: "That did not go through. Try again in a moment." });
      }
    },
    [clientId],
  );

  const unsubscribe = useCallback(
    async (publicKey: string) => {
      if (!clientId) return;
      setState({ status: "working", subscribed: true, publicKey });

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        /* The server first: if the record survives, the next regime change
           notifies a browser that has already let go of the subscription. */
        const response = await fetch(PUSH_ENDPOINT, {
          method: "DELETE",
          headers: { [CLIENT_ID_HEADER]: clientId },
        });
        if (!response.ok) throw new Error("not removed");
        await existing?.unsubscribe();

        setState({ status: "ready", subscribed: false, publicKey });
      } catch {
        setState({ status: "failed", reason: "That did not go through. Try again in a moment." });
      }
    },
    [clientId],
  );

  if (!supported || state.status === "unavailable" || state.status === "loading") return null;

  if (state.status === "denied") {
    return (
      <p className="text-sm leading-6 text-slate-400">
        This browser is blocking notifications from this site. You can change that in its site settings — or
        get the same alert by email from the weekly brief signup.
      </p>
    );
  }

  if (state.status === "failed") {
    return <p className="text-sm leading-6 text-amber-200">{state.reason}</p>;
  }

  const busy = state.status === "working";

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void (state.subscribed ? unsubscribe(state.publicKey) : subscribe(state.publicKey))}
        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-500/60 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Working…" : state.subscribed ? "Stop notifying this browser" : "Notify this browser when conditions change"}
      </button>
      <p className="text-sm leading-6 text-slate-400">
        {state.subscribed
          ? "This browser will be notified when conditions change — not every week, only when they do."
          : "One notification when conditions change, which is a handful of times a year. Nothing weekly, and nothing that needs an email address."}
      </p>
    </div>
  );
};
