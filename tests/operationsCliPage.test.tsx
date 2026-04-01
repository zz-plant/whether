import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { operationsDeveloperReferenceLinks, operationsWorkstreamLinks } from "../lib/navigation/operationsNavigation";

describe("operations navigation", () => {
  it("keeps operations focused on the weekly plan route", () => {
    assert.deepEqual(operationsWorkstreamLinks.map((link) => link.href), ["/operations"]);
  });

  it("exposes developer references for API, CLI fallback, and integrations", () => {
    assert.equal(operationsDeveloperReferenceLinks.length, 3);
    assert.ok(operationsDeveloperReferenceLinks.some((link) => link.href.endsWith("/docs/developer/api-reference.md")));
    assert.ok(operationsDeveloperReferenceLinks.some((link) => link.href.endsWith("/docs/developer/cli-fallback.md")));
    assert.ok(operationsDeveloperReferenceLinks.some((link) => link.href.endsWith("/docs/developer/integrations.md")));
  });
});
