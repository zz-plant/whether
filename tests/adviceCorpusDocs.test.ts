import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { ADVICE_CORPUS_DOCS } from "../lib/research/adviceCorpusDocs";

/*
 * /concepts links the advice corpus's pre-registration and results to copies served from this
 * site, because the repository is private. The copies are bundled text, so an edit to
 * docs/research/ that skips the generator would publish the old version.
 */

const FIX = "Run bun scripts/research/publishResearchDocs.ts.";

describe("the advice corpus documents served on the site", () => {
  it("match docs/research/ exactly", () => {
    assert.equal(ADVICE_CORPUS_DOCS.registration, readFileSync("docs/research/advice-corpus-preregistration.md", "utf8"), FIX);
    assert.equal(ADVICE_CORPUS_DOCS.results, readFileSync("docs/research/advice-corpus-results.md", "utf8"), FIX);
  });

  it("are served as readable text at the paths /concepts links", async () => {
    const routes = [
      { route: await import("../app/research/advice-corpus-preregistration.md/route"), text: ADVICE_CORPUS_DOCS.registration },
      { route: await import("../app/research/advice-corpus-results.md/route"), text: ADVICE_CORPUS_DOCS.results },
    ];
    for (const { route, text } of routes) {
      const response = await route.GET();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
      assert.equal(await response.text(), text);
    }
  });
});
