import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";

/**
 * A service worker is configuration, and the fact is the text.
 *
 * It cannot be rendered or imported here — it runs in a worker scope this suite
 * has no way to create, and `self.addEventListener("fetch")` means nothing in a
 * test process. So this reads the file, which the rule in docs/agents/lessons/tests-and-copy-rules.md allows for
 * exactly this case and requires saying so at the site.
 *
 * What is worth guarding is not the caching strategy but the refusals. A
 * service worker is the one piece of a site that can outlive a bad deploy and
 * keep serving it: every rule below is a way this file could quietly start
 * lying about freshness or make the site unreachable.
 */

const readWorker = () => readFile("public/sw.js", "utf8");

describe("service worker", () => {
  it("never caches an API route", async () => {
    const source = await readWorker();
    assert.match(
      source,
      /url\.pathname\.startsWith\("\/api\/"\)\)\s*return;/,
      "a cached posture reading served as live is exactly the staleness this exists to refuse",
    );
  });

  it("only ever handles same-origin GETs", async () => {
    const source = await readWorker();
    assert.match(source, /request\.method !== "GET"\)\s*return;/);
    assert.match(source, /url\.origin !== self\.location\.origin\)\s*return;/);
  });

  /* Cache-first is safe only for a URL whose bytes cannot change. The page fonts
     carry their hash in the name; the share-card faces in /fonts/og/ are
     regenerated in place, so they stay off the immutable cache. */
  it("treats only hashed URLs as immutable, not the share-card faces", async () => {
    const source = await readWorker();
    const rule = /const isImmutableAsset = \(url\) =>([\s\S]*?);\n/.exec(source)?.[1] ?? "";
    assert.ok(rule, "isImmutableAsset is gone or renamed");
    assert.match(rule, /startsWith\("\/fonts\/"\)/);
    assert.match(rule, /!url\.pathname\.startsWith\("\/fonts\/og\/"\)/);
  });

  /*
   * Cache-first for a document is how a site serves last week forever. The live
   * answer has to win whenever there is one; the cache is the fallback, and the
   * page says so when it is used.
   */
  it("prefers the network for documents and falls back to the cache", async () => {
    const source = await readWorker();
    const strategy = /const documentStrategy = async \(request\) => \{([\s\S]*?)\n\};/.exec(source)?.[1] ?? "";
    assert.ok(strategy, "documentStrategy is gone or renamed");

    const fetchAt = strategy.indexOf("await fetch(request)");
    const cacheAt = strategy.indexOf("await caches.match(request)");
    assert.ok(fetchAt >= 0 && cacheAt >= 0, "both halves of the fallback must be present");
    assert.ok(fetchAt < cacheAt, "the cache is consulted after the network fails, not before it is tried");
  });

  /* No cached match and no network is the browser's own error page. Substituting
     a different cached page would answer a question the reader did not ask. */
  it("re-throws rather than substituting a page it was not asked for", async () => {
    const source = await readWorker();
    assert.match(source, /if \(cached\) return cached;\s*\n\s*throw error;/);
  });

  /* A worker that never takes over leaves an old one serving an old build; one
     that never sweeps leaves every past version's cache on the device. */
  it("takes over and sweeps its own old caches", async () => {
    const source = await readWorker();
    assert.match(source, /self\.skipWaiting\(\)/);
    assert.match(source, /self\.clients\.claim\(\)/);
    assert.match(source, /caches\.delete\(name\)/);
    assert.match(source, /name\.startsWith\("whether-"\)/, "sweeping by prefix, so it cannot delete another app's cache");
  });

  it("is registered, and not in development where it would serve yesterday's bundle", async () => {
    const registrar = await readFile("app/components/serviceWorkerRegistrar.tsx", "utf8");
    assert.match(registrar, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
    assert.match(registrar, /process\.env\.NODE_ENV !== "production"\)\s*return;/);

    const layout = await readFile("app/layout.tsx", "utf8");
    assert.match(layout, /<ServiceWorkerRegistrar \/>/, "a worker nothing registers is a file, not a feature");
  });

  /*
   * The half that makes the cache honest. The manifest has declared standalone
   * since before any of this existed, so the app installed and then failed to
   * open offline; serving the last copy without naming its date would trade
   * that for a quieter, worse failure.
   */
  it("is paired with a notice naming the reading a cached page contains", async () => {
    const home = await readFile("app/page.tsx", "utf8");
    assert.match(home, /<OfflineNotice recordDateLabel=/);

    const notice = await readFile("app/components/offlineNotice.tsx", "utf8");
    assert.match(notice, /recordDateLabel/, "the date has to come from the page, not be read independently");
    assert.match(notice, /addEventListener\("offline"/);
    assert.match(notice, /removeEventListener\("offline"/);
  });

  /*
   * The ledger's replay. The Background Sync spec schedules its retries from a
   * rejected waitUntil promise: a replay that swallows a failure resolves, the
   * one-off registration is removed, and whatever is still stashed in IndexedDB
   * strands until some later event happens to re-register the tag.
   */
  it("rejects the sync when entries remain queued, so the browser schedules the retry", async () => {
    const source = await readWorker();
    assert.match(source, /if \(retryable\) throw new Error\("decision-ledger-retry/);
    // A retryable failure (network error or 5xx) leaves the entry; a 4xx refusal drops it.
    assert.match(source, /response\.status >= 500/);
    assert.match(source, /await deleteStashedPost\(post\.key\)/, "deletion is per entry, by the key stored in its value");
  });
});
