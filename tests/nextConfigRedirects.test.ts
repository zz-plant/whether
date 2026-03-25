import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("keeps legacy methodology alias permanently routed to Method formula reference", async () => {
    const redirects = await nextConfig.redirects?.();

    assert.deepEqual(redirects, [
      {
        source: "/methodology",
        destination: "/method#formula-reference",
        permanent: true,
      },
    ]);
  });
});
