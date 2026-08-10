import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isReportShellRoute } from "../lib/navigation/globalHeader";

describe("isReportShellRoute", () => {
  it("keeps reduced mode on core report paths and nested report routes", () => {
    assert.equal(isReportShellRoute("/"), true);
    assert.equal(isReportShellRoute("/signals"), true);
    assert.equal(isReportShellRoute("/evidence/time-machine"), true);
    assert.equal(isReportShellRoute("/planning/cli"), true);
  });

  it("preserves the full header on non-report routes", () => {
    assert.equal(isReportShellRoute("/search"), false);
    assert.equal(isReportShellRoute("/guides"), false);
    assert.equal(isReportShellRoute("/answers/should-we-hire"), false);
  });
});
