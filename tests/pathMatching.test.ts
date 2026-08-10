import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { pathMatchesLink } from "../lib/navigation/pathMatching";

describe("pathMatchesLink", () => {
  it("matches exact routes and subpaths", () => {
    assert.equal(pathMatchesLink("/learn", "/learn"), true);
    assert.equal(pathMatchesLink("/learn", "/learn/failure-modes"), true);
  });

  it("does not match unrelated paths", () => {
    assert.equal(pathMatchesLink("/answer", "/use-cases"), false);
    assert.equal(pathMatchesLink("/answer", "/concepts"), false);
  });
});
