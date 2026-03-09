import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSearchIndex, groupSearchResultsByType, searchIndex } from "../lib/search/searchIndex";

describe("search index", () => {
  it("aggregates toolkit, failure-mode, concept, and doc entities", () => {
    const entities = buildSearchIndex();

    assert.ok(entities.some((entity) => entity.type === "toolkit"));
    assert.ok(entities.some((entity) => entity.type === "failure-mode"));
    assert.ok(entities.some((entity) => entity.type === "concept"));
    assert.ok(entities.some((entity) => entity.type === "doc"));
  });

  it("returns ranked results for a query", () => {
    const results = searchIndex("rollback");

    assert.ok(results.length > 0);
    assert.equal(results[0]?.type, "toolkit");
  });

  it("groups results by entity type", () => {
    const grouped = groupSearchResultsByType(searchIndex("method"));

    assert.ok(grouped.doc.length > 0);
  });
});
