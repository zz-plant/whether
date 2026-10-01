import { requestUrl } from "./fixtures/requestTarget";
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDefaultIngestionStore } from "../lib/ingestion/store";
import { createGuardedFetch, isLocalTarget, redactTarget, targetUrl } from "../scripts/test-network-guard";

/**
 * The suite runs offline by default.
 *
 * Not for speed alone, though the speed is the visible part: blocking outbound fetch
 * took the full run from 49.3s to 13.7s on 2026-09-03 with all 1169 tests still
 * passing, because not one of them needed the network. Three files held ~18s of that
 * between them, all of it spent on FRED reads nothing asserted against.
 *
 * The reason is that a suite which inherits the network answers differently depending
 * on where it runs, and this repo has already paid for it: Invariant 1 ("reading
 * performs zero writes") passed in a sandbox that reaches nothing and failed every
 * Cloudflare build from 2026-08-30 to 2026-09-02, where FRED answers and the read path
 * therefore ingested and took the refresh lock. docs/agents/lessons/automation-and-deploy-gate.md draws the rule from that —
 * "a test about writes has to serve its own upstreams" — and the guard makes it the
 * default rather than something each test has to remember.
 *
 * These cases test the guard's own logic rather than the live `globalThis.fetch`. Bun
 * runs every file in one process and the gate shuffles their order, so a test that
 * asserted on the global would be asserting on whatever the previously-run file left
 * behind.
 */
describe("test network guard", () => {
  const alwaysLocal: typeof fetch = async () => new Response("local");

  const guarded = (passThrough: typeof fetch = alwaysLocal) => {
    const explained: string[] = [];
    return { fetch: createGuardedFetch(passThrough, (text) => explained.push(text)), explained };
  };

  it("blocks an outbound host and names it", async () => {
    const { fetch: guardedFetch } = guarded();

    await assert.rejects(
      () => guardedFetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"),
      /blocked outbound fetch to https:\/\/fred\.stlouisfed\.org/,
    );
  });

  /*
   * The message reaches test output and, in the deploy gate, a build log. Several URLs
   * here are credentials outright: SLACK_WEBHOOK_URL and PREMIUM_FUNNEL_WEBHOOK_URL carry
   * their secret in the path, and lib/premiumFunnel.ts hands one straight to the global
   * fetch this guard wraps. So the message names the origin and drops everything after it
   * — right by construction, where a path-scrubbing heuristic would have to keep being
   * right about every shape of secret added later.
   */
  it("names a blocked upstream without repeating its credentials", async () => {
    const slackWebhook = "https://hooks.slack.com/services/T00000000/B00000000/xoxbSuperSecretToken";
    const { fetch: guardedFetch } = guarded();

    const error = await guardedFetch(slackWebhook).then(
      () => null,
      (reason: unknown) => (reason instanceof Error ? reason.message : String(reason)),
    );

    assert.ok(error, "a webhook URL must still be blocked");
    assert.match(error, /https:\/\/hooks\.slack\.com/, "the origin is what makes the message actionable");
    for (const secret of ["xoxbSuperSecretToken", "T00000000", "B00000000", "/services/"]) {
      assert.ok(!error.includes(secret), `the message leaked ${secret}`);
    }
  });

  it("keeps the origin and drops path, query, fragment and userinfo", () => {
    assert.equal(redactTarget("https://hooks.slack.com/services/T0/B0/secret"), "https://hooks.slack.com");
    assert.equal(redactTarget("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"), "https://fred.stlouisfed.org");
    assert.equal(redactTarget("https://example.com/x#tok=abc"), "https://example.com");
    assert.equal(redactTarget("https://user:pa55word@example.com/x"), "https://example.com");
    // A non-default port distinguishes two upstreams on one host, so it is part of the origin.
    assert.equal(redactTarget("https://example.com:8443/x"), "https://example.com:8443");
    // Never fall back to echoing something unparseable.
    assert.equal(redactTarget("::: not a url :::"), "an unparseable URL");
  });

  it("explains how to serve the upstream once, not on every call", async () => {
    const { fetch: guardedFetch, explained } = guarded();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await guardedFetch("https://home.treasury.gov/resource-center").catch(() => {});
    }

    assert.equal(explained.length, 1, "a caught-and-logged error must not reprint the guidance");
    assert.match(explained[0] ?? "", /fixtureFetch/);
    assert.match(explained[0] ?? "", /WHETHER_TEST_ALLOW_NETWORK=1/);
  });

  // tests/whetherCli.test.ts starts a server and points the CLI at it. That is the
  // suite serving its own upstream, which is the thing the guard exists to encourage.
  it("lets a test reach a server the suite itself started", async () => {
    const seen: string[] = [];
    const recordingFetch: typeof fetch = async (input) => {
      seen.push(requestUrl(input));
      return new Response("local");
    };
    const { fetch: guardedFetch } = guarded(recordingFetch);

    for (const url of ["http://127.0.0.1:4321/api/ping", "http://localhost:3000/api/health", "/api/relative"]) {
      assert.equal((await guardedFetch(url)).status, 200);
    }

    assert.equal(seen.length, 3);
  });

  it("judges loopback by host, not by substring", () => {
    for (const local of ["http://127.0.0.1:80/x", "http://127.9.9.9/x", "http://localhost/x", "http://[::1]/x"]) {
      assert.equal(isLocalTarget(local), true, local);
    }
    // The ones a looser check would wave through: a real host that merely mentions
    // loopback, or carries it somewhere other than the host.
    for (const remote of [
      "https://localhost.fred.stlouisfed.org/x",
      "https://example.com/proxy?to=127.0.0.1",
      "https://127.0.0.1.example.com/x",
    ]) {
      assert.equal(isLocalTarget(remote), false, remote);
    }
  });

  it("reads the target out of every shape fetch accepts", () => {
    assert.equal(targetUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(targetUrl(new URL("https://example.com/b")), "https://example.com/b");
    assert.equal(targetUrl(new Request("https://example.com/c")), "https://example.com/c");
  });

  it("is preloaded for every bun test, including one that bypasses the runner", async () => {
    const bunfig = await readFile("bunfig.toml", "utf8");
    assert.match(bunfig, /\[test\]/);
    assert.match(bunfig, /preload\s*=\s*\[".\/scripts\/test-network-guard\.ts"\]/);
  });

  it("keeps an escape hatch for deliberately exercising a real upstream", async () => {
    const guard = await readFile("scripts/test-network-guard.ts", "utf8");
    assert.match(guard, /process\.env\.WHETHER_TEST_ALLOW_NETWORK === "1"/);
    assert.match(guard, /if \(!ALLOW_NETWORK\)/);
  });
});

/*
 * The ingestion file store is the upstream the guard did not cover. An online run in the
 * checkout left a live reading under .cache/ingestion and the offline suite read it back,
 * so tests about the bundled snapshot failed on a clean diff. The preload gives every run
 * its own directory; this holds the store to it.
 */
describe("test ingestion directory", () => {
  it("keeps the file store out of the checkout", async () => {
    const dir = process.env.WHETHER_INGESTION_DIR;
    assert.ok(dir, "the preload sets WHETHER_INGESTION_DIR");
    assert.ok(!path.resolve(dir).startsWith(`${process.cwd()}${path.sep}`), `${dir} is inside the checkout`);

    const store = getDefaultIngestionStore();
    assert.equal(store.backendStatus?.(), "local-fallback", "no binding in the suite, so the file store");

    /* Another file in this process may already have materialized a model here; put it
       back afterwards so the shuffled order cannot change what that file reads. */
    const file = path.join(dir, "latest.materialized.json");
    const previous = existsSync(file) ? readFileSync(file, "utf8") : null;
    try {
      await store.writeLatestMaterialized({ asOf: "2026-10-01T00:00:00.000Z", signals: {} });
      assert.ok(existsSync(file), "the store wrote outside the per-run directory");
      assert.equal((await store.readLatestMaterialized())?.asOf, "2026-10-01T00:00:00.000Z");
    } finally {
      if (previous === null) rmSync(file, { force: true });
      else writeFileSync(file, previous, "utf8");
    }
  });
});
