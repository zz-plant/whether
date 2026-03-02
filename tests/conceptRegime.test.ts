import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findProductConceptArticle } from "../lib/productCanon";
import { getConceptRegimeStatus, getCurrentRegimeContext } from "../lib/conceptRegime";

describe("concept regime mismatch", () => {
  it("returns mismatch for a concept written in an opposite regime", () => {
    const article = findProductConceptArticle("product-strategy-vs-product-plan");
    assert.ok(article);

    const status = getConceptRegimeStatus(article, "SCARCITY");
    assert.equal(status, "mismatch");
  });

  it("returns unknown when no publication snapshot exists", () => {
    const article = findProductConceptArticle("what-exactly-is-a-product-manager");
    assert.ok(article);

    const status = getConceptRegimeStatus(article, "EXPANSION");
    assert.equal(status, "unknown");
  });

  it("exposes a current regime context from the latest summary", () => {
    const current = getCurrentRegimeContext();
    assert.ok(current);
    assert.match(current?.asOf ?? "", /^\d{4}-\d{2}-01$/);
  });
});
