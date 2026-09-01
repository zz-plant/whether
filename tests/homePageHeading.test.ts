import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("homepage heading contract", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  it("keeps the home route responsible for the page-level h1", () => {
    assert.match(source, /<h1 className="sr-only" id="share-ready-artifact">/);
  });

  it("still names the weekly brief when no cadence is selected", () => {
    assert.match(source, /: "Weekly Brief"/);
  });

  it("names the selected horizon instead when one is", () => {
    assert.match(source, /cadenceCall\.cadenceLabel, cadenceCall\.periodLabel/);
  });
});
