import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("does not configure route redirects", async () => {
    const redirects = await nextConfig.redirects?.();
    assert.ok(redirects == null || redirects.length === 0);
  });
});
