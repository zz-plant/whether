import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "bun:test";

type HeaderEntry = { source: string; headers: Array<{ key: string; value: string }> };
type NextConfigModule = { default: { headers: () => Promise<HeaderEntry[]> } };
const require = createRequire(import.meta.url);
/* The pattern `nextConfigRedirects.test.ts` uses: next.config.js ships no types. */
const loadNextConfig = (): NextConfigModule => require("../next.config.js");

/**
 * Pages carry no shared-cache header from config.
 *
 * `/` renders from the stage and runway cookies, so a `public, s-maxage` header
 * on it would let the edge serve one reader's tailored brief to every other
 * reader. Four such headers sat in `next.config.js` until 2026-09-23 and were
 * inert only because vinext overrides Cache-Control on a dynamic response —
 * a framework detail, not a guarantee. API route handlers set their own
 * headers in code and are not covered here.
 */
describe("page cache headers", () => {
  it("declares no shared-cache directive for any page source", async () => {
    const entries = await loadNextConfig().default.headers();
    const shared = entries.filter((entry) =>
      entry.headers.some((header) => header.key.toLowerCase() === "cache-control" && /s-maxage|public/i.test(header.value)),
    );
    assert.deepEqual(shared.map((entry) => entry.source), []);
  });
});
