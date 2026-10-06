/**
 * Blocks outbound network from the test suite.
 *
 * Loaded for every `bun test` run through `bunfig.toml`, so it applies to the
 * runner, to `bun run test <path>`, and to a bare `bun test` alike.
 *
 * The suite already serves its own upstreams wherever a test asserts on data:
 * `tests/architectureInvariants.test.ts` hands the read path a fixture fetcher,
 * and `scripts/run-tests.mjs` strips `FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY`
 * so a shell cannot reroute a fixture-driven test to a real API. What it did not
 * do was stop the *un*-asserted reads: code under test that calls FRED or
 * Treasury on a path the test never checks, and simply waits for whatever the
 * box happens to allow.
 *
 * That waiting was most of the suite. Measured on 2026-09-03, blocking outbound
 * fetch took the full run from 49.3s to 13.7s with all 1169 tests still passing
 * — not one test needed the network. Three files held ~18s of it on their own
 * (`/api/health` 8.5s -> 0.4s, `whetherClientSdk` 5.3s -> 0.4s,
 * `mcpCommitmentLinter` 4.8s -> 0.4s), all of it spent on FRED reads whose
 * results nothing asserted against.
 *
 * Speed is the smaller half. A suite that inherits the network gives a different
 * answer depending on where it runs, and this repo has already paid for that:
 * Invariant 1 ("reading performs zero writes") passed in a sandbox that reaches
 * nothing and failed every Cloudflare build from 2026-08-30 to 2026-09-02, where
 * FRED answers and the read path therefore ingested and took the refresh lock.
 * docs/agents/lessons/automation-and-deploy-gate.md draws the rule from it — "a test about writes has to serve its own
 * upstreams" — and this makes the rule the default instead of a thing each test
 * has to remember. The same argument the runner already makes about a stray API
 * key: a result that depends on what the environment happens to allow is not a
 * result about the code.
 *
 * Loopback stays open. `tests/whetherCli.test.ts` starts a local server and
 * points the CLI at it, which is the suite serving its own upstream rather than
 * reaching for someone else's.
 *
 * A test that replaces `globalThis.fetch` with its own mock still wins — it
 * assigns over this one, which is the intended way to serve a fixture. The guard
 * only decides what an *unmocked* call does.
 *
 * Escape hatch, for deliberately exercising a real upstream:
 *   WHETHER_TEST_ALLOW_NETWORK=1 bun run test <path>
 *
 * The ingestion file store is an upstream too, and the guard alone did not cover it:
 * an online run in the same checkout (`bun run seo:answers:launch-readiness`, a dev
 * server) leaves a live reading under .cache/ingestion, and the read path served it
 * back to a suite that had no network. `tests/jev.test.ts` and
 * `tests/homeMetadata.test.ts` went red on a clean diff until the directory was
 * deleted. So every run gets its own empty store, the state a fresh clone starts in,
 * whatever the shell exports and whether or not the network is allowed.
 *
 * The guard itself — what counts as local, how a blocked target is named — is
 * `scripts/network-guard.lib.ts`. This file is the suite's side of it: the escape
 * hatch, the guidance a blocked test prints, and the ingestion store. The blocked
 * target is named by origin alone because this repo's webhook URLs are credentials
 * in their entirety: `SLACK_WEBHOOK_URL` and `PREMIUM_FUNNEL_WEBHOOK_URL` hold their
 * secret in the path, and `lib/premiumFunnel.ts` hands one straight to the global
 * `fetch` this wraps.
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
