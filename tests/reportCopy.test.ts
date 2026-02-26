import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BEGINNER_GLOSSARY_ENTRIES,
  FIRST_TIME_GUIDE_HIGHLIGHTS,
  FIRST_TIME_GUIDE_NEXT_LINKS,
  FIRST_TIME_GUIDE_STEPS,
  GLOSSARY_USAGE_NOTES,
  ONBOARDING_RELATED_LINKS,
  SIGNALS_RELATED_LINKS,
} from "../lib/report/reportCopy";

describe("reportCopy", () => {
  it("defines first-time guide content with three ordered steps", () => {
    assert.equal(FIRST_TIME_GUIDE_STEPS.length, 3);
    assert.deepEqual(
      FIRST_TIME_GUIDE_STEPS.map((step) => step.label),
      ["Summary", "Proof", "Actions"],
    );
    FIRST_TIME_GUIDE_STEPS.forEach((step) => {
      assert.ok(step.detail.length > 20);
      assert.match(step.example, /^Example decision:/);
    });
  });

  it("includes glossary entries with report anchors", () => {
    assert.ok(BEGINNER_GLOSSARY_ENTRIES.length >= 4);
    BEGINNER_GLOSSARY_ENTRIES.forEach((entry) => {
      assert.ok(entry.value);
      assert.ok(entry.term);
      assert.ok(entry.summary);
      assert.ok(entry.why.startsWith("Why it matters:"));
      assert.ok(entry.usedInHref.startsWith("#"));
    });
  });

  it("keeps glossary notes and quick links non-empty", () => {
    assert.ok(FIRST_TIME_GUIDE_HIGHLIGHTS.length > 0);
    assert.ok(FIRST_TIME_GUIDE_NEXT_LINKS.length >= 3);
    assert.equal(GLOSSARY_USAGE_NOTES.length, 2);

    GLOSSARY_USAGE_NOTES.forEach((note) => {
      assert.ok(note.title.length > 0);
      assert.equal(note.bullets.length, 3);
      note.bullets.forEach((bullet) => {
        assert.ok(bullet.emphasis.length > 0);
        assert.ok(bullet.detail.length > 0);
      });
    });
  });

  it("provides related links metadata for onboarding and signals pages", () => {
    [SIGNALS_RELATED_LINKS, ONBOARDING_RELATED_LINKS].forEach((links) => {
      assert.equal(links.length, 3);
      links.forEach((link) => {
        assert.ok(link.href.startsWith("/"));
        assert.ok(link.label.length > 0);
        assert.ok(link.description.length > 15);
      });
    });
  });
});
