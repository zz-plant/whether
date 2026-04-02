import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET as getSlackBriefRoute } from "../app/api/brief/slack/route";


const originalFetch = globalThis.fetch;
const disabledFetch: typeof fetch = async () => {
  throw new Error("Test fetch disabled");
};

beforeEach(() => {
  globalThis.fetch = disabledFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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
