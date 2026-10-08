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
 * The mechanism is the `bun-test-network-guard` package; the history (49s to 14s, and the
 * invariant that passed only where FRED was reachable) is in
 * docs/agents/lessons/toolchain-and-gates.md, "The suite runs offline".
 */
import { afterAll } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { installNetworkGuard, type GuardOptions } from "bun-test-network-guard";

/** Which variable opens the network for a run, and where this suite keeps a fixture fetcher. */
export const suiteNetworkGuard = {
  allowEnv: "WHETHER_TEST_ALLOW_NETWORK",
  hint: "See fixtureFetch in tests/architectureInvariants.test.ts for a fixture fetcher.",
} satisfies GuardOptions;

installNetworkGuard(suiteNetworkGuard);

const ingestionDir = mkdtempSync(join(tmpdir(), "whether-test-ingestion-"));
process.env.WHETHER_INGESTION_DIR = ingestionDir;
// A preload's afterAll runs once, after the last file; bun test never fires process "exit".
afterAll(() => rmSync(ingestionDir, { recursive: true, force: true }));
