import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSiteUrl } from "../lib/siteUrl";

describe("site URL resolution", () => {
  it("falls back to the default URL when the value is missing", () => {
    assert.equal(resolveSiteUrl(undefined), "https://whether.report");
  });

  it("adds https when the value is missing a protocol", () => {
    assert.equal(
      resolveSiteUrl("whether.kanavj.workers.dev"),
      "https://whether.kanavj.workers.dev"
    );
  });

  it("returns the origin for valid absolute URLs", () => {
    assert.equal(resolveSiteUrl("https://example.com/path?x=1"), "https://example.com");
  });

  it("falls back to the default URL when the value is invalid", () => {
    assert.equal(resolveSiteUrl("http://[::1"), "https://whether.report");
  });
});
