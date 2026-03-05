import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET as getSlackBriefRoute } from "../app/api/brief/slack/route";

describe("/api/brief/slack", () => {
  it("returns slack-ready brief payload", async () => {
    const response = await getSlackBriefRoute();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.version, "v1");
    assert.equal(typeof body.recordDate, "string");
    assert.equal(typeof body.generatedAt, "string");
    assert.equal(typeof body.brief, "string");
    assert.match(body.brief, /Whether Report Brief/);
  });
});
