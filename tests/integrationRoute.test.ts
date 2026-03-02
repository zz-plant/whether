import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getWeeklyMandateRoute } from "../app/api/integrations/weekly-mandate/route";

describe("weekly mandate integration route", () => {
  it("returns 400 for invalid target", async () => {
    const request = new Request("https://whether.test/api/integrations/weekly-mandate?target=invalid");
    const response = await getWeeklyMandateRoute(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Invalid integration target.");
    assert.deepEqual(body.supportedTargets, ["slack", "notion", "linear"]);
  });
});
