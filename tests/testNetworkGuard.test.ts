import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { createGuardedFetch } from "bun-test-network-guard";
import { getDefaultIngestionStore } from "../lib/ingestion/store";
import { suiteNetworkGuard } from "../scripts/test-network-guard";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

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
 * The guard itself — what counts as loopback, the origin-only error, the one-time
 * explanation — is the `bun-test-network-guard` package and is tested there. What stays
 * here is this suite's wiring, and the fixture its files use to declare an upstream
 * unreachable. The only live `globalThis.fetch` asserted on is the one this file installs
 * at the top: Bun runs every file in one process and the gate shuffles their order, so
 * anything else would be whatever the previously-run file left behind.
 */
describe("test network guard", () => {
  it("is preloaded for every bun test, including one that bypasses the runner", async () => {
    const bunfig = await readFile("bunfig.toml", "utf8");
    assert.match(bunfig, /\[test\]/);
    assert.match(bunfig, /preload\s*=\s*\[".\/scripts\/test-network-guard\.ts"\]/);
  });

  it("tells a blocked test where this suite keeps its fixtures and how to open the network", async () => {
    const explained: string[] = [];
    const guardedFetch = createGuardedFetch(
      async () => new Response("local"),
      (text) => explained.push(text),
      suiteNetworkGuard,
    );

    await assert.rejects(
      () => guardedFetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"),
      /blocked outbound fetch to https:\/\/fred\.stlouisfed\.org$/,
    );
    assert.match(explained[0] ?? "", /fixtureFetch/);
    assert.match(explained[0] ?? "", /WHETHER_TEST_ALLOW_NETWORK=1/);
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

/*
 * The 48 files that assert on the fallback call `serveUnreachableUpstreams()`, which
 * answers for the upstream instead of leaving the refusal to the guard. This file calls it
 * too, at the top, so its fetch is the one these cases see.
 */
describe("an upstream the test declares unreachable", () => {
  it("rejects as an unreachable host does, naming only the origin", async () => {
    await assert.rejects(
      () => fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10&api_key=secret"),
      (error: unknown) =>
        error instanceof TypeError &&
        error.message === "fetch failed: https://fred.stlouisfed.org is unreachable in this test",
    );
  });

  it("still reaches a server the test started", async () => {
    const server = createServer((_request, response) => response.end("served"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address: AddressInfo | string | null = server.address();
      assert.ok(address && typeof address === "object", "the server is listening on a port");
      assert.equal(await (await fetch(`http://127.0.0.1:${address.port}/`)).text(), "served");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
