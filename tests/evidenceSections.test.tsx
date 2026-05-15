import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("SignalsModeSwitcherSection", () => {
  it("uses custom radio buttons without Base UI's extra native radio inputs", () => {
    const source = readFileSync(new URL("../app/evidence/components/evidenceSections.tsx", import.meta.url), "utf8");

    assert.match(source, /role="radiogroup"/);
    assert.match(source, /role="radio"/);
    assert.match(source, /aria-checked=/);
    assert.match(source, /type="button"/);
    assert.doesNotMatch(source, /@base-ui\/react\/radio/);
    assert.doesNotMatch(source, /type="radio"/);
  });
});
