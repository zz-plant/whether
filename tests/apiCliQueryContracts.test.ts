import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAsOfSearchParam, rejectUnsupportedCliQuery } from "../lib/cli/queryContracts";

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
});
