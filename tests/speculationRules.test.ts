import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { SPECULATION_RULES_PATH, withSpeculationRules } from "../lib/runtime/speculationRules";

/**
 * Hover prefetch rules, delivered by the worker's Speculation-Rules response
 * header. The header is a Structured Fields list of URLs whose resources carry
 * the rules JSON — not the JSON itself, which the HTML standard refuses — so
 * the header points at `/speculation-rules.json` and that file holds the
 * rules. The layout must never regain a speculationrules script element: a
 * script with a `src` is ignored by the standard, so the header is the
 * mechanism.
 */

const htmlResponse = () =>
  new Response("<!doctype html><html><body>brief</body></html>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

/* The rules parsed with a schema, not a cast: a malformed rule fails with a
   zod path here instead of a TypeError deep inside an assertion. */
const rulesSchema = z.object({
  prefetch: z.array(
    z.object({
      source: z.string(),
      eagerness: z.string(),
      where: z.object({ and: z.array(z.record(z.string(), z.unknown())) }),
    }),
  ),
});

describe("speculation rules", () => {
  it("rides document responses as a URL the browser can fetch", () => {
    const response = withSpeculationRules(htmlResponse());
    const header = response.headers.get("Speculation-Rules");
    assert.equal(header, `"${SPECULATION_RULES_PATH}"`, "the header names the rules resource, not the JSON inline");
  });

  it("serves the rules document that URL points at", async () => {
    const rules = rulesSchema.parse(JSON.parse(await readFile("public/speculation-rules.json", "utf8")));
    assert.equal(rules.prefetch.length, 1, "one prefetch rule");
    const [rule] = rules.prefetch;
    assert.ok(rule, "the prefetch rule is present");
    assert.equal(rule.source, "document");
    assert.equal(rule.eagerness, "moderate", "moderate is hover-driven: one request per hovered link, nothing executed");
    assert.ok(rule.where.and.some((clause) => JSON.stringify(clause).includes("/api/**")), "endpoints are not pages a reader navigates to");
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