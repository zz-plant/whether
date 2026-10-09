import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { PREMISE_TEST_DOCS } from "../lib/research/premiseTestDocs";

/*
 * /trust links the premise test's registration and results to copies served
 * from this site, because the repository is private. The copies are bundled
 * text, so an edit to docs/research/ that skips the generator would publish
 * the old version.
 */

const FIX = "Run bun scripts/research/publishPremiseTestDocs.ts.";

describe("the premise test documents served on the site", () => {
  it("match docs/research/ exactly", () => {
    assert.equal(PREMISE_TEST_DOCS.registration, readFileSync("docs/research/premise-test-preregistration.md", "utf8"), FIX);
    assert.equal(PREMISE_TEST_DOCS.results, readFileSync("docs/research/premise-test-results.md", "utf8"), FIX);
  });

  it("are served as readable text at the paths /trust links", async () => {
    const routes = [
      { route: await import("../app/research/premise-test-registration.md/route"), text: PREMISE_TEST_DOCS.registration },
      { route: await import("../app/research/premise-test-results.md/route"), text: PREMISE_TEST_DOCS.results },
    ];
    for (const { route, text } of routes) {
      const response = await route.GET();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
      assert.equal(await response.text(), text);
    }
  });
});
