import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createBreadcrumbTrail, getBreadcrumbLabel } from "../lib/navigation/breadcrumbs";
import { isRoute, toRoute } from "../lib/navigation/routeType";

describe("navigation breadcrumbs", () => {
  it("preserves Home as the root breadcrumb label", () => {
    assert.equal(getBreadcrumbLabel("/"), "Home");
    assert.deepEqual(createBreadcrumbTrail([{ path: "/" }]), [{ name: "Home", path: "/" }]);
  });

  it("resolves canonical navigation layer labels", () => {
    assert.equal(getBreadcrumbLabel("/operate"), "Plan");
    assert.equal(getBreadcrumbLabel("/signals"), "Evidence");
    assert.equal(getBreadcrumbLabel("/resolve"), "Resolve");
    assert.equal(getBreadcrumbLabel("/trust"), "Trust");
    assert.equal(getBreadcrumbLabel("/history"), "History");
    assert.equal(getBreadcrumbLabel("/resources"), "Resources");
  });

  it("prefers explicit fallback labels when provided", () => {
    assert.equal(getBreadcrumbLabel("/operate/financial", "Financial strategy"), "Financial strategy");
    const trail = createBreadcrumbTrail([
      { path: "/" },
      { path: "/operate" },
      { path: "/operate/financial", label: "Financial strategy" },
    ]);
    assert.deepEqual(trail, [
      { name: "Home", path: "/" },
      { name: "Plan", path: "/operate" },
      { name: "Financial strategy", path: "/operate/financial" },
    ]);
  });

  it("formats unmapped slug segments into title case", () => {
    assert.equal(getBreadcrumbLabel("/toolkits/growth-efficiency"), "Growth Efficiency");
  });

  it("validates route paths at runtime instead of asserting them", () => {
    assert.equal(isRoute("/operate"), true);
    assert.equal(isRoute("operate"), false);
    assert.equal(toRoute("/operate?x=1"), "/operate?x=1");
    assert.throws(() => toRoute("operate"));
  });
});
