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
    assert.equal(resolveGlobalHeaderRouteLabel("/threshold"), "Framework");
    assert.equal(resolveGlobalHeaderRouteLabel("/template"), "Template");
    assert.equal(resolveGlobalHeaderRouteLabel("/api-docs"), "API Docs");
    assert.equal(resolveGlobalHeaderRouteLabel("/about"), "About");
    assert.equal(resolveGlobalHeaderRouteLabel("/about/"), "About");

    // Utility routes must not leak into nav ordering or next-step cues.
    assert.equal(resolveReportHeaderNextStep("/threshold"), null);
    assert.equal(resolveReportHeaderNextStep("/about"), null);
    assert.equal(isReportShellRoute("/about"), false);
  });

  it("does not match a utility label on an unrelated path that merely shares a prefix", () => {
    assert.equal(resolveGlobalHeaderRouteLabel("/thresholdish"), "Page");
    assert.equal(resolveGlobalHeaderRouteLabel("/templating"), "Page");
  });

  it("resolves report routes back to the one-screen brief", () => {
    assert.equal(resolveReportHeaderNextStep("/"), null);
    assert.deepEqual(resolveReportHeaderNextStep("/operate"), { href: "/", label: "Weekly Brief" });
    assert.deepEqual(resolveReportHeaderNextStep("/signals/thresholds"), { href: "/", label: "Weekly Brief" });
    assert.deepEqual(resolveReportHeaderNextStep("/answer"), { href: "/", label: "Weekly Brief" });
    assert.deepEqual(resolveReportHeaderNextStep("/trust"), { href: "/", label: "Weekly Brief" });
    assert.deepEqual(resolveReportHeaderNextStep("/history"), { href: "/", label: "Weekly Brief" });
    assert.equal(resolveReportHeaderNextStep("/nonexistent"), null);
  });

  it("marks the brief active only on the home route", () => {
    const homeLinks = resolveGlobalHeaderNavigationLinks("/").filter((link) => link.isActive);
    assert.equal(homeLinks.length, 1);
    assert.equal(homeLinks[0]?.href, "/");

    // Demoted report routes are not primary, so no primary link is active there;
    // the one-screen brief stays the single primary destination.
    const reportLinks = resolveGlobalHeaderNavigationLinks("/answer/use-cases").filter((link) => link.isActive);
    assert.equal(reportLinks.length, 0);
  });
});
