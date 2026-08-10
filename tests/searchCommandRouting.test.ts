import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { resolveSearchCommandHref } from "../app/search/page";
import { buildToolkitLibraryHref, resolveToolkitLibraryState } from "../app/answer/components/toolkitLibraryPanels";
import { resolveReportHeaderUtilityAction } from "../app/components/globalHeaderRouteGate";
import { searchIndex } from "../lib/search/searchIndex";

describe("search command routing", () => {
  it("routes toolkit-like resolve queries into the decide toolkit shortlist", () => {
    const results = searchIndex("rollback");

    assert.equal(resolveSearchCommandHref("rollback", results), buildToolkitLibraryHref("rollback"));
  });

  it("routes trust and risk queries into canonical trust anchors", () => {
    assert.equal(resolveSearchCommandHref("confidence", searchIndex("confidence")), "/trust#trust-snapshot");
    assert.equal(resolveSearchCommandHref("failure mode", searchIndex("failure mode")), "/trust#revisit-call");
  });

  it("keeps the home Find a tool action pointed at the toolkit library", () => {
    assert.deepEqual(resolveReportHeaderUtilityAction("/"), {
      href: buildToolkitLibraryHref(),
      label: "Toolkits",
    });
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
