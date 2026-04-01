import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSearchIndex, groupSearchResultsByJob, searchIndex } from "../lib/search/searchIndex";

describe("search index", () => {
  it("aggregates toolkit, failure-mode, and doc entities", () => {
    const entities = buildSearchIndex();

    assert.ok(entities.some((entity) => entity.type === "toolkit"));
    assert.ok(entities.some((entity) => entity.type === "failure-mode"));
    assert.ok(entities.some((entity) => entity.type === "doc"));
  });

  it("returns ranked results for a query", () => {
    const results = searchIndex("rollback");

    assert.ok(results.length > 0);
    assert.equal(results[0]?.type, "toolkit");
  });

  it("groups results by entity job", () => {
    const grouped = groupSearchResultsByJob(searchIndex("method"));

    assert.ok(grouped.trust.some((result) => result.type === "doc"));
  });

  it("routes governance-artifact queries back into Planning rather than the retired resources hub shell", () => {
    const resourceDoc = buildSearchIndex().find((entity) => entity.id === "doc-resources");

    assert.equal(resourceDoc?.href, "/operations#ops-export-briefs");
  });
});
