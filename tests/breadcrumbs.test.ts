import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBreadcrumbTrail, getBreadcrumbLabel } from "../lib/navigation/breadcrumbs";

describe("navigation breadcrumbs", () => {
  it("preserves Home as the root breadcrumb label", () => {
    assert.equal(getBreadcrumbLabel("/"), "Home");
    assert.deepEqual(createBreadcrumbTrail([{ path: "/" }]), [{ name: "Home", path: "/" }]);
  });
});
