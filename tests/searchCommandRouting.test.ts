import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { resolveSearchCommandHref } from "../app/search/searchCommand";
import { buildToolkitLibraryHref, resolveToolkitLibraryState } from "../app/resolve/components/toolkitLibraryPanels";
import { searchIndex } from "../lib/search/searchIndex";
import { buildGuidanceSearchHref } from "../app/components/commandPalette";

describe("search command routing", () => {
  it("routes toolkit-like resolve queries into the decide toolkit shortlist", () => {
    const results = searchIndex("rollback");

    assert.equal(resolveSearchCommandHref("rollback", results), buildToolkitLibraryHref("rollback"));
  });

  it("routes trust and risk queries into canonical trust anchors", () => {
    assert.equal(resolveSearchCommandHref("confidence", searchIndex("confidence")), "/trust#trust-snapshot");
    assert.equal(resolveSearchCommandHref("failure mode", searchIndex("failure mode")), "/trust#revisit-call");
  });
});

describe("toolkit library routing", () => {
  it("builds decide toolkit shortlist URLs", () => {
    assert.equal(buildToolkitLibraryHref(), "/resolve#toolkit-library");
    assert.equal(buildToolkitLibraryHref("rollback"), "/resolve?toolkitQuery=rollback#toolkit-library");
  });

  it("defaults to a routed shortlist and filters when a query is present", () => {
    const shortlistState = resolveToolkitLibraryState();
    const filteredState = resolveToolkitLibraryState("pmf");

    assert.ok(shortlistState.filteredToolkits.length > 0);
    assert.equal(shortlistState.filteredToolkits.length, shortlistState.routedShortlist.length);
    assert.ok(filteredState.filteredToolkits.some((toolkit) => toolkit.slug === "pmf"));
  });
});

describe("command palette guidance search", () => {
  it("routes a free-text query to /search rather than filtering commands only", () => {
    // The palette filtered a fixed list of navigation entries and actions, so a
    // guidance query like "hiring plan" returned "No matching commands". That was
    // survivable while the header carried a free-text field submitting to /search
    // and stopped being survivable when that field was hidden on mobile to fix the
    // document overflow — the palette is the only path to /search on a phone.
    assert.equal(buildGuidanceSearchHref("hiring plan"), "/search?q=hiring%20plan");
  });

  it("encodes characters that would otherwise break the query string", () => {
    assert.equal(buildGuidanceSearchHref("runway & burn"), "/search?q=runway%20%26%20burn");
    assert.equal(buildGuidanceSearchHref("10Y-2Y spread"), "/search?q=10Y-2Y%20spread");
  });

  it("trims surrounding whitespace before routing", () => {
    assert.equal(buildGuidanceSearchHref("  hiring  "), "/search?q=hiring");
  });

  it("keeps the palette wired to it, so the mobile path cannot regress silently", async () => {
    const source = await readFile("app/components/commandPalette.tsx", "utf8");
    assert.ok(source.includes("buildGuidanceSearchHref(trimmed)"), "palette no longer routes to /search");
  });
});
