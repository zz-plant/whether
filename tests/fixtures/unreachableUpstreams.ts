import { afterAll } from "bun:test";
import { isLocalTarget, redactTarget } from "bun-test-network-guard";

import { requestUrl } from "./requestTarget";

/**
 * Serves every remote upstream as unreachable for the rest of this test file.
 *
 * Most page and agent tests render the read path on a cold store, which ingests inline
 * (about ten FRED and Treasury reads), fails, and serves the bundled snapshot; the fallback
 * is what they assert on. They used to get there by having the network guard refuse each
 * fetch, which the read path caught, so the attempts were invisible: on 2026-10-14, 126
 * tests made 4,880 of them. `bun-test-network-guard` 0.2.0 fails a test that makes one.
 * This states the same condition as the test's own decision: the upstream is down, and
 * the code under test sees exactly the rejection an unreachable host gives.
 *
 * Call it at the top of the file, after the imports, so a model built at module scope is
 * covered too. Loopback still reaches whatever `fetch` was in place; a test that assigns
 * its own `globalThis.fetch` still wins; the file's `afterAll` puts the previous one back.
 */
export function serveUnreachableUpstreams(): void {
  const previous = globalThis.fetch;
  const unreachable = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (isLocalTarget(url)) return previous(input, init);
    throw new TypeError(`fetch failed: ${redactTarget(url)} is unreachable in this test`);
  };
  const fetchUnreachable: typeof fetch = Object.assign(unreachable, { preconnect: () => {} });
  globalThis.fetch = fetchUnreachable;
  afterAll(() => {
    globalThis.fetch = previous;
  });
}
