/**
 * Registers the service worker, in production only.
 *
 * Not in development, for a reason that costs an afternoon every time someone
 * learns it: a worker serving cached assets in front of a dev server hands you
 * yesterday's bundle and no indication why. The landmark audit boots a dev
 * server too, and it should be auditing the routes rather than a cache of them.
 *
 * Registration is deliberately the only thing here. Everything about what is
 * cached, and about never serving a cached reading as a live one, is in
 * public/sw.js where a reader looking for the caching rules will look.
 */
"use client";

import { useEffect } from "react";

export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    /* Failure is silent on purpose: an unsupported browser, a private window,
       or a blocked registration all mean "no offline support", which is the
       state every visitor was in before this existed. */
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
};
