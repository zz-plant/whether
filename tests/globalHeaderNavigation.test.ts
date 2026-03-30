import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  resolveGlobalHeaderRouteLabel,
} from "../lib/navigation/globalHeader";

describe("global header navigation helpers", () => {
  it("normalizes trailing slash paths", () => {
    assert.equal(normalizePathname("/signals/"), "/signals");
    assert.equal(normalizePathname("/"), "/");
  });

  it("derives report-shell visibility from canonical route list", () => {
    assert.equal(isReportShellRoute("/"), true);
    assert.equal(isReportShellRoute("/signals/overview"), true);
    assert.equal(isReportShellRoute("/operations/plan"), true);
    assert.equal(isReportShellRoute("/decide"), true);
    assert.equal(isReportShellRoute("/method"), true);
  });

  it("uses canonical IA labels for condensed report route context", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/signals/thresholds"), "Evidence");
    assert.equal(resolveGlobalHeaderRouteLabel("/operations/cli"), "Planning");
    assert.equal(resolveGlobalHeaderRouteLabel("/nonexistent"), "Report");
  });

  it("marks only one primary link active for nested paths", () => {
    const activeLinks = resolveGlobalHeaderNavigationLinks("/decide/use-cases").filter((link) => link.isActive);

    assert.equal(activeLinks.length, 1);
    assert.equal(activeLinks[0]?.href, "/decide");
  });
});
