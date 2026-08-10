import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  isReportShellRoute,
  normalizePathname,
  resolveGlobalHeaderNavigationLinks,
  resolveGlobalHeaderRouteLabel,
  resolveReportHeaderNextStep,
} from "../lib/navigation/globalHeader";

describe("global header navigation helpers", () => {
  it("normalizes trailing slash paths", () => {
    assert.equal(normalizePathname("/evidence/"), "/evidence");
    assert.equal(normalizePathname("/"), "/");
  });

  it("derives report-shell visibility from canonical route list", () => {
    assert.equal(isReportShellRoute("/"), true);
    assert.equal(isReportShellRoute("/evidence/overview"), true);
    assert.equal(isReportShellRoute("/planning/plan"), true);
    assert.equal(isReportShellRoute("/resolve"), true);
    assert.equal(isReportShellRoute("/trust"), true);
  });

  it("uses canonical IA labels for condensed report route context", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/evidence/thresholds"), "Evidence");
    assert.equal(resolveGlobalHeaderRouteLabel("/planning/cli"), "Plan");
    assert.equal(resolveGlobalHeaderRouteLabel("/resolve/use-cases"), "Resolve");
    assert.equal(resolveGlobalHeaderRouteLabel("/trust"), "Trust");
    assert.equal(resolveGlobalHeaderRouteLabel("/nonexistent"), "Page");
  });

  it("labels utility routes without adding them to the operator loop", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/framework"), "Framework");
    assert.equal(resolveGlobalHeaderRouteLabel("/template"), "Template");
    assert.equal(resolveGlobalHeaderRouteLabel("/api-docs"), "API Docs");
    assert.equal(resolveGlobalHeaderRouteLabel("/about"), "About");
    assert.equal(resolveGlobalHeaderRouteLabel("/about/"), "About");

    // Utility routes must not leak into nav ordering or next-step cues.
    assert.equal(resolveReportHeaderNextStep("/framework"), null);
    assert.equal(resolveReportHeaderNextStep("/about"), null);
    assert.equal(isReportShellRoute("/about"), false);
  });

  it("does not match a utility label on an unrelated path that merely shares a prefix", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/frameworkish"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/templating"), "Page");
  });

  it("walks the operator loop for next-step cues and cycles back to the brief", () => {
    assert.deepEqual(resolveReportHeaderNextStep("/"), { href: "/evidence", label: "Evidence" });
    assert.deepEqual(resolveReportHeaderNextStep("/evidence/thresholds"), { href: "/planning", label: "Plan" });
    assert.deepEqual(resolveReportHeaderNextStep("/planning"), { href: "/resolve", label: "Resolve" });
    assert.deepEqual(resolveReportHeaderNextStep("/resolve"), { href: "/trust", label: "Trust" });
    assert.deepEqual(resolveReportHeaderNextStep("/trust"), { href: "/", label: "Brief" });
    assert.equal(resolveReportHeaderNextStep("/history"), null);
    assert.equal(resolveReportHeaderNextStep("/nonexistent"), null);
  });

  it("marks only one primary link active for nested paths", () => {
    const activeLinks = resolveGlobalHeaderNavigationLinks("/resolve/use-cases").filter((link) => link.isActive);

    assert.equal(activeLinks.length, 1);
    assert.equal(activeLinks[0]?.href, "/resolve");
  });
});
