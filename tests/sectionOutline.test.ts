import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  resolveActiveSectionId,
  sectionIdFromHref,
  sectionIdsFromHrefs,
} from "../lib/navigation/sectionOutline";

describe("sectionIdFromHref", () => {
  it("reads the id out of a fragment href", () => {
    assert.equal(sectionIdFromHref("#current-scores"), "current-scores");
  });

  it("returns null for anything that is not a fragment", () => {
    // The regression this pins: the outline compared a pathname against these
    // hrefs. A route href has no section id, and a bare "#" names none either.
    assert.equal(sectionIdFromHref("/signals"), null);
    assert.equal(sectionIdFromHref("/signals#current-scores"), null);
    assert.equal(sectionIdFromHref("#"), null);
  });

  it("keeps only the fragment links when mapping a whole outline", () => {
    assert.deepEqual(
      sectionIdsFromHrefs(["#trends", "/operate", "#curve-context"]),
      ["trends", "curve-context"],
    );
  });
});

describe("resolveActiveSectionId", () => {
  const ids = ["decision-summary", "trends", "current-scores", "curve-context"];

  it("picks the topmost on-screen section in document order", () => {
    assert.equal(resolveActiveSectionId(ids, ["current-scores", "trends"], null), "trends");
  });

  it("does not depend on the order the observer reports entries", () => {
    // Scrolling up and scrolling down deliver the same two sections in opposite
    // order; both must resolve to the same section.
    const down = resolveActiveSectionId(ids, ["trends", "current-scores"], null);
    const up = resolveActiveSectionId(ids, ["current-scores", "trends"], null);
    assert.equal(down, up);
  });

  it("holds the previous section when nothing is in the band", () => {
    assert.equal(resolveActiveSectionId(ids, [], "trends"), "trends");
  });

  it("reports nothing before the first section is ever seen", () => {
    assert.equal(resolveActiveSectionId(ids, [], null), null);
  });

  it("ignores on-screen ids that are not in the outline", () => {
    assert.equal(resolveActiveSectionId(ids, ["some-other-anchor"], null), null);
  });
});
