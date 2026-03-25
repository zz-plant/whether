import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("redirects retired startup-macro-posture routes to canonical surfaces", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    assert.deepEqual(redirects, [
      {
        source: "/startup-macro-posture/index",
        destination: "/method#formula-reference",
        permanent: true,
      },
      {
        source: "/startup-macro-posture/:regime",
        destination: "/posture/:regime",
        permanent: true,
      },
      {
        source: "/startup-macro-posture",
        destination: "/posture",
        permanent: true,
      },
    ]);
  });
});
