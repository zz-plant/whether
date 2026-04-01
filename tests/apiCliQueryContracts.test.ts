import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { NextRequest, NextResponse } from "next/server";
import { CLI_QUERY_ALLOWLIST_BY_ENDPOINT, parseAsOfSearchParam, parseWeeksSearchParam, rejectUnsupportedCliQuery } from "../lib/cli/queryContracts";
import { INVALID_AS_OF_ERROR, parseCliRouteRequest } from "../lib/api/cliRoute";

describe("api cli query contracts", () => {
  it("parses supported asOf values into report search params", () => {
    assert.deepEqual(parseAsOfSearchParam("2024-07"), { month: "7", year: "2024" });
  });

  it("rejects full-date, malformed, and out-of-range asOf values", () => {
    assert.equal(parseAsOfSearchParam("2024-07-15"), null);
    assert.equal(parseAsOfSearchParam("2024/07"), null);
    assert.equal(parseAsOfSearchParam("2024-13"), null);
    assert.equal(parseAsOfSearchParam("1999-12"), null);
  });

  it("rejects unsupported query parameters explicitly", async () => {
    const request = {
      nextUrl: new URL("http://localhost:3000/api/cli/status?company=acme&asOf=2024-06"),
    };
    const response = rejectUnsupportedCliQuery(request, ["asOf"]);
    assert.ok(response);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Unsupported query parameters.",
      unsupported: ["company"],
      supported: ["asOf"],
    });
  });

  it("parses weeks with defaults, valid custom values, invalid values, and max clamping", () => {
    assert.deepEqual(
      parseWeeksSearchParam({ weeks: null, defaultWeeks: 12, maxWeeks: 52 }),
      { requestedWeeks: 12, windowWeeks: 12, truncatedToMax: false },
    );

    assert.deepEqual(
      parseWeeksSearchParam({ weeks: "8", defaultWeeks: 12, maxWeeks: 52 }),
      { requestedWeeks: 8, windowWeeks: 8, truncatedToMax: false },
    );

    assert.equal(parseWeeksSearchParam({ weeks: "abc", defaultWeeks: 12, maxWeeks: 52 }), null);
    assert.equal(parseWeeksSearchParam({ weeks: "0", defaultWeeks: 12, maxWeeks: 52 }), null);

    assert.deepEqual(
      parseWeeksSearchParam({ weeks: "200", defaultWeeks: 12, maxWeeks: 52 }),
      { requestedWeeks: 200, windowWeeks: 52, truncatedToMax: true },
    );
  });

  it("defines endpoint-specific allowlists and deterministic unsupported responses", async () => {
    const expected = {
      status: ["asOf", "view"],
      call: ["asOf"],
      changes: ["asOf"],
      diagnostics: ["asOf"],
      regime: ["asOf"],
      history: ["asOf", "weeks"],
      scenario: ["tightness", "risk-appetite"],
    };

    for (const [endpoint, allowlist] of Object.entries(expected)) {
      assert.deepEqual(CLI_QUERY_ALLOWLIST_BY_ENDPOINT[endpoint as keyof typeof CLI_QUERY_ALLOWLIST_BY_ENDPOINT], allowlist);

      const unsupportedRequest = {
        nextUrl: new URL(`http://localhost:3000/api/cli/${endpoint}?${allowlist[0]}=ok&unsupported=nope`),
      };
      const unsupported = rejectUnsupportedCliQuery(unsupportedRequest, allowlist);
      assert.ok(unsupported);
      assert.equal(unsupported.status, 400);
      assert.deepEqual(await unsupported.json(), {
        error: "Unsupported query parameters.",
        unsupported: ["unsupported"],
        supported: allowlist,
      });

      const supportedRequest = {
        nextUrl: new URL(`http://localhost:3000/api/cli/${endpoint}?${allowlist.map((key) => `${key}=ok`).join("&")}`),
      };
      const supportedOnly = rejectUnsupportedCliQuery(supportedRequest, allowlist);
      assert.equal(supportedOnly, null);
    }
  });

  it("normalizes route asOf query via shared parser", () => {
    const parsed = parseCliRouteRequest(
      new NextRequest("http://localhost:3000/api/cli/status?asOf=2024-06"),
      CLI_QUERY_ALLOWLIST_BY_ENDPOINT.status,
    );

    assert.deepEqual(parsed, { asOf: { year: 2024, month: 6 } });
  });

  it("returns shared invalid-asOf response payload", async () => {
    const parsed = parseCliRouteRequest(
      new NextRequest("http://localhost:3000/api/cli/status?asOf=2024-13"),
      CLI_QUERY_ALLOWLIST_BY_ENDPOINT.status,
    );

    assert.ok(parsed instanceof NextResponse);
    assert.equal(parsed.status, 400);
    assert.deepEqual(await parsed.json(), { error: INVALID_AS_OF_ERROR });
  });

  it("returns NextResponse for unsupported query parameters in shared route parser", async () => {
    const parsed = parseCliRouteRequest(
      new NextRequest("http://localhost:3000/api/cli/status?foo=1"),
      CLI_QUERY_ALLOWLIST_BY_ENDPOINT.status,
    );

    assert.ok(parsed instanceof NextResponse);
    assert.equal(parsed.status, 400);
    assert.deepEqual(await parsed.json(), {
      error: "Unsupported query parameters.",
      unsupported: ["foo"],
      supported: ["asOf", "view"],
    });
  });

});
