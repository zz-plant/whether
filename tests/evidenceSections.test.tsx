import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("SignalsModeSwitcherSection", () => {
  it("uses native radios in the group without Base UI's radio component", () => {
    // The pair used to be `<button role="radio">`, which left both options in
    // the tab order instead of the one stop plus arrow keys a radiogroup owes
    // its users. Native inputs get that from the platform; each one is visually
    // hidden inside the label that draws the visible ring, so the look is
    // unchanged. Base UI's Radio is still kept out — that was the original point
    // of this test, and it is the part that has not changed.
    const source = readFileSync(new URL("../app/signals/components/evidenceSections.tsx", import.meta.url), "utf8");

    assert.match(source, /role="radiogroup"/);
    assert.match(source, /type="radio"/);
    assert.match(source, /name="signals-view"/);
    assert.match(source, /checked={activeSignalsView === item\.id}/);
    assert.doesNotMatch(source, /@base-ui\/react\/radio/);
    assert.doesNotMatch(source, /role="radio"/);
  });
});
