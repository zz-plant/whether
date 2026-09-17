/*
 * Offline support for an app that already told the browser it was one.
 *
 * app/manifest.ts declares `display: "standalone"` with a maskable icon and
 * three shortcuts, so Whether installs to a home screen — and then failed to
 * open at all without a network, which is worse than not being installable. A
 * weekly brief is the ideal offline document: one page, one reading, read in
 * places with bad wifi, which is most of the places a board meeting happens.
 *
 * The rule this repo would impose on any cache, and the one this file is built
 * around: cache-then-label, never silent staleness. Serving Tuesday's brief on
 * Friday without saying so is the same failure as the freeze job writing a
 * ten-week-old record and exiting 0. So navigations are network-first — the
 * live answer wins whenever there is one — and the cached fallback is paired
 * with an on-page notice naming the reading it is showing
 * (app/components/offlineNotice.tsx).
 *
 * A broken service worker can make a site permanently unreachable for anyone
 * who visited once, so every rule here fails towards the network:
 *   - only GET, only same-origin
 *   - never /api/: a cached posture reading served as live is the exact lie above
 *   - network-first for documents, so a reachable network always wins
 *   - no cached match and no network means the browser's own error, not a
 *     substitute page pretending to be the one asked for
 */

const VERSION = "v1";
const DOCUMENT_CACHE = `whether-documents-${VERSION}`;
const ASSET_CACHE = `whether-assets-${VERSION}`;
const CACHES = [DOCUMENT_CACHE, ASSET_CACHE];

/* Hashed by the build, so a hit is always the right bytes and a miss is cheap. */
const isImmutableAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/");

const isDocumentRequest = (request) =>
  request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

self.addEventListener("install", () => {
  /* Nothing is precached. A precache list is a second source of truth for what
     the app is made of, and it goes stale against the build that produced it. */
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("whether-") && !CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Network first, then whatever this browser saw last. The page says which it got. */
const documentStrategy = async (request) => {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DOCUMENT_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
};

/** Cache first for content that cannot change without changing its URL. */
const assetStrategy = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  /* Every /api/ route is either a live reading or an owned write. A cached
     reading served without the page knowing is the staleness this file exists
     to refuse, and an owned write must never be replayed from a cache. */
  if (url.pathname.startsWith("/api/")) return;

  if (isImmutableAsset(url)) {
    event.respondWith(assetStrategy(request));
    return;
  }

  if (isDocumentRequest(request)) {
    event.respondWith(documentStrategy(request));
  }
});
