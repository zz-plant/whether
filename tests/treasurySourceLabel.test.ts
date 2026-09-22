import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { TREASURY_SOURCE_LABEL } from "../lib/regimeEngineCore";
import { TERM_DEFINITIONS } from "../lib/report/reportCopy";
import { TREASURY_ENDPOINTS } from "../lib/treasury/treasuryClient";

/*
 * The site cites TREASURY_SOURCE_LABEL as where its rate inputs come from, and for months it
 * named DFF, which nothing fetched: the endpoint constant existed but never reached the request
 * the client builds, so the base rate silently came from the one-month bill instead. A wrong
 * source label is not a cosmetic bug in a product whose argument is that you can check its work.
 *
 * Comparing the label against the endpoints the client actually declares makes the two drift
 * together or not at all. It catches the specific way this broke -- a series named but not read --
 * and its opposite, a series read but not disclosed.
 */
const seriesInLabel = (label: string): string[] => {
  const inParentheses = /\(([^)]*)\)/.exec(label);
  if (!inParentheses) return [];
  return inParentheses[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => /^[A-Z0-9]+$/.test(entry));
};

const seriesInEndpoints = (endpoints: Record<string, string>): string[] =>
  Object.values(endpoints)
    .map((url) => /[?&]id=([A-Z0-9]+)/.exec(url)?.[1])
    .filter((id): id is string => Boolean(id));

describe("Treasury source label", () => {
  it("names every series the client fetches, and only those", () => {
    const claimed = [...seriesInLabel(TREASURY_SOURCE_LABEL)].sort();
    const fetched = [...seriesInEndpoints(TREASURY_ENDPOINTS)].sort();

    assert.ok(claimed.length > 0, "the label names no series at all");
    assert.deepEqual(claimed, fetched);
  });

  it("does not claim DFF, which no endpoint reads", () => {
    // Pinned by name because this is the one that shipped: removing it from the label without
    // removing the endpoint, or the reverse, both leave the product describing itself wrongly.
    assert.ok(!TREASURY_SOURCE_LABEL.includes("DFF"), "the label claims DFF");
    assert.ok(!JSON.stringify(TREASURY_ENDPOINTS).includes("DFF"), "an endpoint reads DFF");
  });

  it("does not claim DFF in the copy that tells readers what to pull", () => {
    /*
     * The label was corrected without the glossary, which kept naming DFF on
     * /trust under "anyone can pull the same series and recompute it" — the one
     * place a false source claim is actively harmful, because it is an
     * instruction. Both surfaces are checked here so they cannot drift apart.
     */
    const copy = JSON.stringify(TERM_DEFINITIONS);
    assert.ok(!copy.includes("DFF"), "term definitions claim DFF");
    assert.ok(!/fed(eral)?[ -]funds/i.test(copy), "term definitions claim the fed funds rate");
  });
});
