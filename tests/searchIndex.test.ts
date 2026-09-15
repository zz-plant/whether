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

  /*
   * `routePriority` was added to every entity's score unconditionally, so the
   * `score > 0` filter removed nothing and a query matching nothing came back
   * as the whole index. A search that always finds everything cannot report
   * that it found nothing, which is why /search could not tell a typo from a
   * question.
   */
  it("returns nothing when nothing matches", () => {
    assert.deepEqual(searchIndex("qwertyuiop"), []);
    assert.deepEqual(searchIndex("   "), []);
  });

  /* `includes` matched "cat" inside "accelerate" and "rate" inside "accelerate". */
  it("matches whole words, not fragments of other words", () => {
    const haystack = buildSearchIndex()
      .map((entity) => [entity.title, entity.summary, entity.intentLabel, ...entity.keywords].join(" ").toLowerCase())
      .join(" ");
    assert.ok(haystack.includes("accelerate"), "fixture assumption: the index contains 'accelerate'");

    assert.ok(searchIndex("accelerate").length > 0, "the whole word still matches");
    assert.deepEqual(searchIndex("celerate"), [], "an interior fragment matches nothing");
    assert.deepEqual(searchIndex("elerat"), [], "an interior fragment matches nothing");
  });

  it("still matches a prefix, so a partial word finds its term", () => {
    const full = searchIndex("rollback");
    const prefix = searchIndex("rollbac");
    assert.ok(full.length > 0);
    assert.deepEqual(prefix.map((entry) => entry.id), full.map((entry) => entry.id));
  });

  it("routes governance-artifact queries back into Planning rather than the retired resources hub shell", () => {
    const resourceDoc = buildSearchIndex().find((entity) => entity.id === "doc-resources");

    assert.equal(resourceDoc?.href, "/operate#ops-export-briefs");
  });
});
