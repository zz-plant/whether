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

/** The rule's parts, narrowed from JSON at runtime — a header is data, not a type. */
const ruleParts = (header: string | null) => {
  if (header === null) return null;
  const parsed: unknown = JSON.parse(header);
  if (typeof parsed !== "object" || parsed === null) return null;
  const prefetch: unknown = Reflect.get(parsed, "prefetch");
  if (!Array.isArray(prefetch) || prefetch.length !== 1) return null;
  const rule: unknown = prefetch[0];
  if (typeof rule !== "object" || rule === null) return null;
  const source: unknown = Reflect.get(rule, "source");
  const eagerness: unknown = Reflect.get(rule, "eagerness");
  const where: unknown = Reflect.get(rule, "where");
  return {
    source: typeof source === "string" ? source : null,
    eagerness: typeof eagerness === "string" ? eagerness : null,
    where: JSON.stringify(where),
  };
};

describe("speculation rules", () => {
  it("rides document responses as the Speculation-Rules header", () => {
    const response = withSpeculationRules(htmlResponse());
    const rule = ruleParts(response.headers.get("Speculation-Rules"));
    assert.ok(rule, "an HTML response must carry exactly one prefetch rule");
    assert.equal(rule.source, "document");
    assert.equal(rule.eagerness, "moderate", "moderate is hover-driven: one request per hovered link, nothing executed");
    assert.ok(rule.where.includes("/api/**"), "endpoints are not pages a reader navigates to");
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
