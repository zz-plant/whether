import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathMatchesLink } from "../lib/navigation/pathMatching";

describe("pathMatchesLink", () => {
  it("matches exact routes and subpaths", () => {
    assert.equal(pathMatchesLink("/learn", "/learn"), true);
    assert.equal(pathMatchesLink("/learn", "/learn/concepts"), true);
  });

  it("does not match unrelated paths", () => {
    assert.equal(pathMatchesLink("/decide", "/use-cases"), false);
    assert.equal(pathMatchesLink("/decide", "/concepts"), false);
  });
});
