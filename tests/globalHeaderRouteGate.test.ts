import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReportShellRoute } from "../lib/navigation/globalHeader";

describe("isReportShellRoute", () => {
  it("keeps reduced mode on core report paths and nested report routes", () => {
    assert.equal(isReportShellRoute("/"), true);
    assert.equal(isReportShellRoute("/signals"), true);
    assert.equal(isReportShellRoute("/signals/time-machine"), true);
    assert.equal(isReportShellRoute("/operations/integrations"), true);
  });

  it("preserves the full header on non-report routes", () => {
    assert.equal(isReportShellRoute("/search"), false);
    assert.equal(isReportShellRoute("/method"), false);
    assert.equal(isReportShellRoute("/decide/founder"), false);
  });
});
