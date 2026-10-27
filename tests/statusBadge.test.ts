import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderStatusBadge } from "../lib/export/statusBadge";

/* The badge is read where the brief's notices are not, so a saved copy says so on the badge. */
describe("status badge", () => {
  it("names the conditions in their weather word, in the conditions' color", () => {
    const svg = renderStatusBadge({ regime: "EXPANSION", conditions: "Sunny", savedCopy: false });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="20" role="img"/);
    assert.ok(svg.includes(">Sunny</text>"));
    assert.ok(svg.includes('fill="#d9a82c"'));
    assert.ok(svg.includes('aria-label="Startup operating conditions this week: Sunny. Whether weekly guidance."'));
  });

  it("says when the reading is a saved copy", () => {
    const svg = renderStatusBadge({ regime: "SCARCITY", conditions: "Freezing", savedCopy: true });
    assert.ok(svg.includes(">Freezing (saved copy)</text>"));
  });

  it("reads light fills in dark ink and dark fills in white", () => {
    assert.ok(renderStatusBadge({ regime: "EXPANSION", conditions: "Sunny", savedCopy: false }).includes('fill="#111517" font-weight="bold"'));
    assert.ok(renderStatusBadge({ regime: "SCARCITY", conditions: "Freezing", savedCopy: false }).includes('fill="#ffffff" font-weight="bold"'));
  });

  it("widens with its text", () => {
    const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
    assert.ok(
      width(renderStatusBadge({ regime: "SCARCITY", conditions: "Freezing", savedCopy: true })) >
        width(renderStatusBadge({ regime: "SCARCITY", conditions: "Freezing", savedCopy: false })),
    );
  });
});
