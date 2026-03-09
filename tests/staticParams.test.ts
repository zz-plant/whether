import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortStaticParamsBySlug, uniqueSortedStaticSlugs } from "../lib/staticParams";

describe("static params helpers", () => {
  it("sorts slug params deterministically", () => {
    const sorted = sortStaticParamsBySlug([
      { slug: "zeta" },
      { slug: "alpha" },
      { slug: "beta" },
    ]);

    assert.deepEqual(sorted, [{ slug: "alpha" }, { slug: "beta" }, { slug: "zeta" }]);
  });

  it("deduplicates and sorts static slugs", () => {
    const unique = uniqueSortedStaticSlugs(["beta", "alpha", "alpha"]);
    assert.deepEqual(unique, [{ slug: "alpha" }, { slug: "beta" }]);
  });
});
