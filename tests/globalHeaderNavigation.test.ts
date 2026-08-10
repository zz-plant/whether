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
    assert.equal(normalizePathname("/signals/"), "/signals");
    assert.equal(normalizePathname("/"), "/");
  });

  it("derives report-shell visibility from canonical route list", () => {
    assert.equal(isReportShellRoute("/"), true);
    assert.equal(isReportShellRoute("/signals/overview"), true);
    assert.equal(isReportShellRoute("/operate/plan"), true);
    assert.equal(isReportShellRoute("/answer"), true);
    assert.equal(isReportShellRoute("/trust"), true);
  });

  it("uses canonical IA labels for condensed report route context", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/signals/thresholds"), "Evidence");
    assert.equal(resolveGlobalHeaderRouteLabel("/operate/cli"), "Plan");
    assert.equal(resolveGlobalHeaderRouteLabel("/answer/use-cases"), "Resolve");
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
    assert.deepEqual(resolveReportHeaderNextStep("/"), { href: "/signals", label: "Evidence" });
    assert.deepEqual(resolveReportHeaderNextStep("/signals/thresholds"), { href: "/operate", label: "Plan" });
    assert.deepEqual(resolveReportHeaderNextStep("/operate"), { href: "/answer", label: "Resolve" });
    assert.deepEqual(resolveReportHeaderNextStep("/answer"), { href: "/trust", label: "Trust" });
    assert.deepEqual(resolveReportHeaderNextStep("/trust"), { href: "/", label: "Brief" });
    assert.equal(resolveReportHeaderNextStep("/history"), null);
    assert.equal(resolveReportHeaderNextStep("/nonexistent"), null);
  });

  it("marks only one primary link active for nested paths", () => {
    const activeLinks = resolveGlobalHeaderNavigationLinks("/answer/use-cases").filter((link) => link.isActive);

    assert.equal(activeLinks.length, 1);
    assert.equal(activeLinks[0]?.href, "/answer");
  });
});
