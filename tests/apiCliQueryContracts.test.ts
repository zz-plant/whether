import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLI_QUERY_ALLOWLISTS, parseAsOfSearchParam, parseWeeksSearchParam, rejectUnsupportedCliQuery } from "../lib/cli/queryContracts";

describe("api cli query contracts", () => {
  it("parses supported asOf values into report search params", () => {
    assert.deepEqual(parseAsOfSearchParam("2024-07"), { month: "7", year: "2024" });
  });

  it("rejects malformed asOf values", () => {
    assert.equal(parseAsOfSearchParam("2024/07"), null);
    assert.equal(parseAsOfSearchParam("2024-13"), null);
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

  it("returns deterministic unsupported-parameter payloads for every cli route allowlist", async () => {
    const cases: Array<{ route: keyof typeof CLI_QUERY_ALLOWLISTS; accepted: string }> = [
      { route: "status", accepted: "asOf" },
      { route: "call", accepted: "asOf" },
      { route: "changes", accepted: "asOf" },
      { route: "diagnostics", accepted: "asOf" },
      { route: "regime", accepted: "asOf" },
      { route: "history", accepted: "weeks" },
      { route: "scenario", accepted: "tightness" },
    ];

    for (const testCase of cases) {
      const request = {
        nextUrl: new URL(`http://localhost:3000/api/cli/${testCase.route}?${testCase.accepted}=1&company=acme`),
      };
      const response = rejectUnsupportedCliQuery(request, [...CLI_QUERY_ALLOWLISTS[testCase.route]]);
      assert.ok(response, `expected unsupported payload for route ${testCase.route}`);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Unsupported query parameters.",
        unsupported: ["company"],
        supported: [...CLI_QUERY_ALLOWLISTS[testCase.route]],
      });
    }
  });


});
