import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDisclosureHref,
  resolveDisclosureInitialOpen,
} from "../app/components/ui/disclosureUrlState";

describe("compact disclosure url sync", () => {
  it("derives open state from the matching query param", () => {
    const params = new URLSearchParams("deepEvidence=1&moreContext=1");

    assert.equal(resolveDisclosureInitialOpen(params, "deepEvidence"), true);
    assert.equal(resolveDisclosureInitialOpen(params, "supportingRationale"), false);
    assert.equal(resolveDisclosureInitialOpen(params, undefined, "1", true), true);
  });

  it("adds and removes only the targeted query param while preserving others", () => {
    const params = new URLSearchParams("role=finance&view=forecast");

    assert.equal(
      buildDisclosureHref("/", params, "deepEvidence", true),
      "/?role=finance&view=forecast&deepEvidence=1",
    );
    assert.equal(
      buildDisclosureHref("/", params, "deepEvidence", false),
      "/?role=finance&view=forecast",
    );
  });
});
