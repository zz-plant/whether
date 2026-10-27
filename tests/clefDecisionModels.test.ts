import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { parseJevResponse, runJev, type JevRequest } from "../lib/jev/jevClient";

const request: JevRequest = {
  state: "A public brief",
  questions: { agrees: { type: "noul", instructions: "Does it agree?", criteria: { true: "Agrees", false: "Contradicts" } } },
};
const credentials = { accountId: "account", apiToken: "test-token" };
const response = (answers: unknown) => ({ model: "clef-omni", answers });

describe("Clef decision contracts", () => {
  it("sends the required selector and embedded media to Omni's model endpoint", async () => {
    let called = false;
    const audio = "data:audio/wav;base64,UklGRg==";
    const result = await runJev({ ...request, audio: [audio] }, {
      ...credentials, model: "clef-omni",
      fetchImpl: async (url, init) => {
        called = true;
        assert.equal(url instanceof Request ? url.url : url.toString(), "https://api.cloudflare.com/client/v4/accounts/account/ai/run/@cf/cloudflare/clef-omni");
        const body = init?.body;
        assert.ok(typeof body === "string");
        assert.deepEqual(JSON.parse(body), { ...request, audio: [audio], model: "clef-omni" });
        return Response.json({ result: response({ agrees: { type: "noul", noul: 0.9 } }) });
      },
    });
    assert.equal(called, true);
    assert.equal(result.ok, true);
  });

  it("refuses unsupported, remote, malformed and oversized media before inference", async () => {
    for (const input of [
      { ...request, audio: ["data:audio/wav;base64,UklGRg=="] },
      { ...request, images: ["https://example.com/image.png"] },
      { ...request, images: ["data:image/png;base64,!"] },
      { ...request, images: Array(5).fill("data:image/png;base64,YQ==") },
      { ...request, images: [`data:image/png;base64,${"YQ==".repeat(1_500_000)}`] },
    ]) {
      const result = await runJev(input, { ...credentials, model: "clef-flash", fetchImpl: async () => { throw new Error("must not fetch"); } });
      assert.equal(result.ok, false);
      if (!result.ok) assert.doesNotMatch(result.reason, /must not fetch/);
    }
  });

  it("refuses wrong answer types, unknown options and invalid probability distributions", () => {
    const questions = { team: { type: "choice" as const, instructions: "Which?", criteria: { hiring: "Hiring", spending: "Spending" } } };
    for (const answer of [
      { type: "noul", noul: 0.9 },
      { type: "choice", choice: "other", confidence: 1, probabilities: { hiring: 0.5, spending: 0.5 } },
      { type: "choice", choice: "hiring", confidence: 2, probabilities: { hiring: 1, spending: 0 } },
      { type: "choice", choice: "hiring", confidence: 1, probabilities: { hiring: 0.8 } },
      { type: "choice", choice: "hiring", confidence: 1, probabilities: { hiring: 0.8, spending: 0.8 } },
      { type: "choice", choice: "hiring", confidence: 1, probabilities: { hiring: -0.2, spending: 1.2 } },
    ]) assert.equal(parseJevResponse(response({ team: answer }), questions).ok, false);
  });

  it("does not accept a failed REST envelope carrying a result", () => {
    assert.equal(parseJevResponse({ success: false, result: response({ agrees: { type: "noul", noul: 0.9 } }) }, ["agrees"]).ok, false);
  });

  it("refuses oversized text locally instead of relying on silent context truncation", async () => {
    let calls = 0;
    const result = await runJev({ ...request, state: "A".repeat(50_000) }, {
      ...credentials, model: "clef-flash", fetchImpl: async () => { calls += 1; throw new Error("must not fetch"); },
    });
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
  });

  it("returns serialization failures without rejecting the caller's promise", async () => {
    const result = await runJev({ ...request, state: { amount: 1n } }, credentials);
    assert.equal(result.ok, false);
  });
});
