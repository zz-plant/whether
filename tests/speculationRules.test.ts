import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { SPECULATION_RULES, withSpeculationRules } from "../lib/runtime/speculationRules";

/**
 * Hover prefetch rules, delivered by the worker's Speculation-Rules response
 * header. The delivery mechanism is the whole point: the HTML standard
 * requires type=speculationrules scripts to be inline and fires an error on
 * one with a src, so the layout's old external-file script prefetched nothing
 * while reading as if it did. The layout must never regain a
 * speculationrules script element — the header is the mechanism.
 */

const htmlResponse = () =>
  new Response("<!doctype html><html><body>brief</body></html>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("speculation rules", () => {
  it("rides document responses as the Speculation-Rules header", () => {
    const response = withSpeculationRules(htmlResponse());
    const header = response.headers.get("Speculation-Rules");
    assert.ok(header, "an HTML response must carry the rules");
    const rules = JSON.parse(header) as { prefetch?: Array<Record<string, unknown>> };
    assert.ok(Array.isArray(rules.prefetch) && rules.prefetch.length === 1);
    const rule = rules.prefetch[0] as { source?: string; where?: { and?: Array<Record<string, unknown>> }; eagerness?: string };
    assert.equal(rule.source, "document");
    assert.equal(rule.eagerness, "moderate", "moderate is hover-driven: one request per hovered link, nothing executed");
    assert.ok(rule.where?.and?.some((clause) => JSON.stringify(clause).includes("/api/**")), "endpoints are not pages a reader navigates to");
  });

  it("parses as the same JSON the constant holds", () => {
    assert.equal(withSpeculationRules(htmlResponse()).headers.get("Speculation-Rules"), SPECULATION_RULES);
  });

  it("leaves non-document responses untouched", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    assert.equal(withSpeculationRules(json), json, "the /api answers must not carry prefetch rules");
    const bare = new Response("ok");
    assert.equal(withSpeculationRules(bare), bare);
  });

  it("is not regressed back into a script element with a src", async () => {
    const layout = await readFile("app/layout.tsx", "utf8");
    assert.doesNotMatch(layout, /type="speculationrules"/, "a speculationrules script with a src is ignored by the standard; the header is the mechanism");
  });
});
