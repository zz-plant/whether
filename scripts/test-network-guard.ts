/**
 * Blocks outbound network from the test suite. Preloaded by `bunfig.toml` for every
 * `bun test`, so the suite means the same thing on every box: a test that needs data
 * serves it (a fixture fetcher, or an assigned `globalThis.fetch`, which still wins).
 * Loopback stays open for a server the suite starts. Every run also gets its own empty
 * ingestion store, so a live reading left under .cache/ by an online run is not served back.
 *
 * Escape hatch, for deliberately exercising a real upstream:
 *   WHETHER_TEST_ALLOW_NETWORK=1 bun run test <path>
 *
 * The mechanism is `scripts/network-guard.lib.ts`; the history (49s to 14s, and the
 * invariant that passed only where FRED was reachable) is in
 * docs/agents/lessons/toolchain-and-gates.md, "The suite runs offline".
 */
import { afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createGuardedFetch, type NetworkGuardOptions } from "./network-guard.lib";

const ALLOW_NETWORK = process.env.WHETHER_TEST_ALLOW_NETWORK === "1";

/** What a blocked call in this suite is called, and how to serve the upstream instead. */
export const suiteNetworkGuard: NetworkGuardOptions = {
  label: "test-network-guard",
  guidance:
    "[test-network-guard] This suite serves its own upstreams so a run means the same thing on every box.\n" +
    "  Serve one: pass a fixture fetcher into the code under test (see fixtureFetch in\n" +
    "  tests/architectureInvariants.test.ts), or assign globalThis.fetch in the test and restore it after.\n" +
    "  To exercise the real upstream on purpose: WHETHER_TEST_ALLOW_NETWORK=1.\n",
};

if (!ALLOW_NETWORK) {
  globalThis.fetch = createGuardedFetch(globalThis.fetch, (text) => process.stderr.write(text), suiteNetworkGuard);
}

const ingestionDir = mkdtempSync(join(tmpdir(), "whether-test-ingestion-"));
process.env.WHETHER_INGESTION_DIR = ingestionDir;
// A preload's afterAll runs once, after the last file; bun test never fires process "exit".
afterAll(() => rmSync(ingestionDir, { recursive: true, force: true }));
