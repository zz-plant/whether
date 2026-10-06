import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { CLI_QUERIES, parseCliQuery, resolveWeeksWindow } from "../lib/cli/queryContracts";

/*
 * Each /api/cli/* route reads its query with the agent tools' own parser, and refuses in the
 * body older CLI copies and curl scripts read (`error`, and `unsupported` / `supported` for a
 * name the route does not take), with the per-argument `problems` an agent tool's refusal
 * carries added beside it.
 */

const INVALID_AS_OF_ERROR = "Invalid asOf input. Expected YYYY-MM.";

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`);

const refusal = async (outcome: unknown) => {
  assert.ok(outcome instanceof NextResponse, "refused");
  assert.equal(outcome.status, 400);
  return outcome.json();
};

const accepted = <Value,>(outcome: Value | NextResponse): Value => {
  assert.ok(!(outcome instanceof NextResponse), "accepted");
  return outcome;
};

describe("api cli query contracts", () => {
  it("reads asOf as the report's search params, and an empty asOf as none", () => {
    assert.deepEqual(accepted(parseCliQuery(request("/api/cli/status?asOf=2024-07"), CLI_QUERIES.status)), { asOf: { month: "7", year: "2024" } });
    assert.deepEqual(accepted(parseCliQuery(request("/api/cli/status?asOf="), CLI_QUERIES.status)).asOf, undefined);
    assert.deepEqual(accepted(parseCliQuery(request("/api/cli/status"), CLI_QUERIES.status)), {});
  });

  it("rejects full-date, malformed, and out-of-range asOf values, in the words it always used", async () => {
    for (const asOf of ["2024-07-15", "2024/07", "2024-13", "1999-12"]) {
      const body = await refusal(parseCliQuery(request(`/api/cli/status?asOf=${asOf}`), CLI_QUERIES.status));
      assert.equal(body.error, INVALID_AS_OF_ERROR, asOf);
      assert.deepEqual(body.problems, [{ argument: "asOf", message: `Argument asOf must be a valid value; got "${asOf}".` }], asOf);
    }
  });

  it("rejects unsupported query parameters explicitly, before reading the rest", async () => {
    const body = await refusal(parseCliQuery(request("/api/cli/status?company=acme&asOf=2024-06"), CLI_QUERIES.status));

    assert.deepEqual(body, {
      error: "Unsupported query parameters.",
      unsupported: ["company"],
      supported: ["asOf", "view"],
      problems: [{ argument: "company", message: 'Unknown argument "company". /api/cli/status takes: asOf, view.', allowed: ["asOf", "view"] }],
    });
    const withBadAsOf = await refusal(parseCliQuery(request("/api/cli/status?asOf=bad&foo=1&bar="), CLI_QUERIES.status));
    assert.equal(withBadAsOf.error, "Unsupported query parameters.");
    assert.deepEqual(withBadAsOf.unsupported, ["foo", "bar"], "an empty value is still a name the route does not take");
  });

  it("defines endpoint-specific allowlists and deterministic unsupported responses", async () => {
    const valid: Record<string, string> = { asOf: "2024-06", view: "expanded", weeks: "8", tightness: "70", "risk-appetite": "40" };
    const expectAllowlist = async (endpoint: string, query: Parameters<typeof parseCliQuery>[1], allowlist: string[]) => {
      assert.equal(query.path, `/api/cli/${endpoint}`);
      const unsupported = await refusal(parseCliQuery(request(`${query.path}?${allowlist[0]}=${valid[allowlist[0]]}&unsupported=nope`), query));
      assert.equal(unsupported.error, "Unsupported query parameters.");
      assert.deepEqual(unsupported.unsupported, ["unsupported"]);
      assert.deepEqual(unsupported.supported, allowlist);
      accepted(parseCliQuery(request(`${query.path}?${allowlist.map((name) => `${name}=${valid[name]}`).join("&")}`), query));
    };

    await expectAllowlist("status", CLI_QUERIES.status, ["asOf", "view"]);
    await expectAllowlist("call", CLI_QUERIES.call, ["asOf"]);
    await expectAllowlist("changes", CLI_QUERIES.changes, ["asOf"]);
    await expectAllowlist("diagnostics", CLI_QUERIES.diagnostics, ["asOf"]);
    await expectAllowlist("regime", CLI_QUERIES.regime, ["asOf"]);
    await expectAllowlist("history", CLI_QUERIES.history, ["asOf", "weeks"]);
    await expectAllowlist("scenario", CLI_QUERIES.scenario, ["tightness", "risk-appetite"]);
    assert.equal(Object.keys(CLI_QUERIES).length, 7);
  });

  it("reads weeks with defaults, valid custom values, invalid values, and max clamping", async () => {
    const weeks = (query: string) => accepted(parseCliQuery(request(`/api/cli/history${query}`), CLI_QUERIES.history)).weeks;
    const window = (query: string) => resolveWeeksWindow({ weeks: weeks(query), defaultWeeks: 12, maxWeeks: 52 });

    assert.deepEqual(window(""), { requestedWeeks: 12, windowWeeks: 12, truncatedToMax: false });
    assert.deepEqual(window("?weeks=8"), { requestedWeeks: 8, windowWeeks: 8, truncatedToMax: false });
    assert.deepEqual(window("?weeks=200"), { requestedWeeks: 200, windowWeeks: 52, truncatedToMax: true });
    for (const bad of ["abc", "0", "1.5", ""]) {
      const body = await refusal(parseCliQuery(request(`/api/cli/history?weeks=${bad}`), CLI_QUERIES.history));
      assert.equal(body.error, "Invalid weeks input. Expected integer between 1 and 52.", bad);
    }
    // asOf is read before weeks, as it always was.
    const both = await refusal(parseCliQuery(request("/api/cli/history?weeks=x&asOf=bad"), CLI_QUERIES.history));
    assert.equal(both.error, INVALID_AS_OF_ERROR);
    assert.equal(both.problems.length, 2);
  });

  /* The scenario route parsed its own numbers; it reads them as the agent tools do. Zero is a
     score, text that is a number is one, and blank text is not zero: `tightness=%20` was read as
     0 (`Number(" ")`), and is refused now, as `tightness=` always was. */
  it("reads a scenario's scores as finite numbers, zero included, and refuses blank text", async () => {
    const scores = (query: string) => accepted(parseCliQuery(request(`/api/cli/scenario?${query}`), CLI_QUERIES.scenario));

    assert.deepEqual(scores("tightness=0&risk-appetite=0"), { tightness: 0, "risk-appetite": 0 });
    assert.deepEqual(scores("tightness=%2080%20"), { tightness: 80 });
    assert.deepEqual(scores("tightness=10&tightness=abc"), { tightness: 10 }, "a name given twice is read at its first value");
    for (const [query, error] of [
      ["tightness=", "Invalid tightness input."],
      ["tightness=%20", "Invalid tightness input."],
      ["tightness=abc", "Invalid tightness input."],
      ["tightness=Infinity", "Invalid tightness input."],
      ["risk-appetite=abc", "Invalid risk-appetite input."],
      ["tightness=abc&risk-appetite=abc", "Invalid tightness input."],
    ]) {
      const body = await refusal(parseCliQuery(request(`/api/cli/scenario?${query}`), CLI_QUERIES.scenario));
      assert.equal(body.error, error, query);
    }
    const body = await refusal(parseCliQuery(request("/api/cli/scenario?tightness=abc"), CLI_QUERIES.scenario));
    assert.deepEqual(body.problems, [{ argument: "tightness", message: 'Argument tightness must be a number; got "abc".' }]);
  });
});
