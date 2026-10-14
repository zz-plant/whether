import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { GET as getAgentRoute } from "../app/api/agent/route";
import { JEV_MODEL, parseJevResponse, runJev, type JevRequest } from "../lib/jev/jevClient";
import { resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { extractSentences, findDisagreements, flaggedQuestions } from "../scripts/jev-copy-audit";

/* The response Cloudflare documents for typesafe/jev, verbatim. */
const documentedResponse = {
  model: "jev-1.13.0",
  answers: {
    is_urgent: { type: "noul", noul: 0.95 },
    department: {
      type: "choice",
      choice: "billing",
      confidence: 0.8,
      probabilities: { billing: 0.87, sales: 0, technical: 0.13 },
    },
    frustration: {
      type: "score",
      score: 1.04,
      confidence: 0.94,
      legend: { 0: "Calm", 1: "Frustrated", 2: "Very angry" },
      probabilities: { 0: 0, 1: 0.96, 2: 0.04 },
    },
  },
  usage: { input_tokens: 426, output_tokens: 73 },
};
const documentedKeys = ["is_urgent", "department", "frustration"];

const request: JevRequest = {
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: {
      type: "noul",
      instructions: "Does this convey urgency?",
      criteria: { true: "Explicitly time-sensitive", false: "No urgency expressed" },
    },
  },
};

describe("parseJevResponse", () => {
  it("reads the documented response bare and wrapped in the REST envelope", () => {
    for (const body of [documentedResponse, { result: documentedResponse, success: true }]) {
      const result = parseJevResponse(body, documentedKeys);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.model, "jev-1.13.0");
      assert.deepEqual(result.answers.is_urgent, { type: "noul", noul: 0.95 });
    }
  });

  it("refuses a response that leaves a question unanswered", () => {
    const result = parseJevResponse(documentedResponse, [...documentedKeys, "sentiment"]);
    assert.deepEqual(result, { ok: false, reason: "response missing answers for: sentiment" });
  });

  it("refuses a malformed response instead of passing it through", () => {
    const result = parseJevResponse({ model: "jev-1.13.0", answers: { x: { type: "noul", noul: 3 } } }, ["x"]);
    assert.equal(result.ok, false);
  });
});

describe("runJev", () => {
  const credentials = { accountId: "acct", apiToken: "token" };

  it("posts the documented Workers AI request", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
      return Response.json({ result: { model: "jev-1.13.0", answers: { is_urgent: { type: "noul", noul: 0.2 } } } });
    };
    const result = await runJev(request, { ...credentials, fetchImpl });

    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    const [{ url, init }] = calls;
    assert.equal(url, "https://api.cloudflare.com/client/v4/accounts/acct/ai/run");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token");
    const body = init?.body;
    assert.ok(typeof body === "string");
    assert.deepEqual(JSON.parse(body), { model: JEV_MODEL, input: request });
  });

  it("posts Clef on its own model path with the request as the body", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
      return Response.json({ result: { model: "clef-flash", answers: { is_urgent: { type: "noul", noul: 0.2 } } } });
    };
    const result = await runJev(request, { ...credentials, fetchImpl, model: "clef-flash" });

    assert.equal(result.ok, true);
    const [call] = calls;
    assert.equal(call?.url, "https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/cloudflare/clef-flash");
    const body = call.init?.body;
    assert.ok(typeof body === "string");
    assert.deepEqual(JSON.parse(body), request);
  });

  it("returns a reason rather than throwing on an error status or a dead network", async () => {
    const status = await runJev(request, { ...credentials, fetchImpl: async () => new Response("no", { status: 403 }) });
    assert.deepEqual(status, { ok: false, reason: "HTTP 403" });

    const thrown = await runJev(request, {
      ...credentials,
      fetchImpl: async () => {
        throw new Error("connect_rejected");
      },
    });
    assert.deepEqual(thrown, { ok: false, reason: "connect_rejected" });
  });
});

describe("/api/agent?format=jev", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = async () => {
      throw new Error("Test fetch disabled");
    };
    resetOperatingSnapshotStore();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetOperatingSnapshotStore();
  });

  it("hands over the same week as the agent payload, with an empty plan slot", async () => {
    const [jevResponse, agentResponse] = await Promise.all([
      getAgentRoute(new Request("https://whether.work/api/agent?format=jev")),
      getAgentRoute(new Request("https://whether.work/api/agent?cadence=weekly")),
    ]);
    const jev = await jevResponse.json();
    const agent = await agentResponse.json();

    assert.equal(jevResponse.status, 200);
    assert.equal(jevResponse.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(jev.format, "jev");
    assert.equal(jev.model, JEV_MODEL);
    assert.equal(jev.request.state.plan, null);
    assert.deepEqual(jev.request.state.whether.regime, agent.agentHandoff.payload.regime);
    assert.deepEqual(jev.request.state.whether.decision_rules, agent.agentHandoff.payload.decision_rules);
    assert.deepEqual(Object.keys(jev.request.questions).sort(), [
      "conflicts_with_call",
      "decision_area",
      "reversibility",
      "wait_for_flip",
    ]);
    assert.deepEqual(Object.keys(jev.request.questions.decision_area.criteria), [
      "hiring",
      "product-tempo",
      "capital-raising",
      "burn-discipline",
      "expansion-bets",
      "other",
    ]);
    assert.ok(jev.use?.summary, "the use constraint travels with the Jev format too");
  });

  /* Offline, the treasury read serves the bundled snapshot. That is the week a pipeline
     must not automate on, and the Monday sends refuse it for the same reason. */
  it("refuses automation on a reading that is not live", async () => {
    const response = await getAgentRoute(new Request("https://whether.work/api/agent?format=jev"));
    const body = await response.json();

    assert.equal(body.automationReady, false);
    assert.equal(typeof body.automationRefusal, "string");
    assert.ok(body.automationRefusal.length > 0);
  });

  it("rejects an unknown format with 400 rather than serving the default shape", async () => {
    const response = await getAgentRoute(new Request("https://whether.work/api/agent?format=xml"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.allowedFormats, ["jev"]);
  });
});

describe("jev copy audit", () => {
  it("reads visible sentences and skips the flight payload", () => {
    const html = [
      "<html><head><style>.a{color:red}</style></head><body>",
      "<h1>Freezing</h1>",
      "<p>Hold net-new hiring until funding pressure falls below 66 points.</p>",
      "<p>Hold net-new hiring until funding pressure falls below 66 points.</p>",
      "<script>self.__next_f.push([1,\"Hidden prop text that no reader ever sees on the page.\"])</script>",
      "<li>Your board will want the runway memo before the Monday meeting.</li>",
      "</body></html>",
    ].join("");

    assert.deepEqual(extractSentences(html), [
      "Hold net-new hiring until funding pressure falls below 66 points.",
      "Your board will want the runway memo before the Monday meeting.",
    ]);
  });

  it("flags only noul answers at or above the threshold", () => {
    const flags = flaggedQuestions(
      {
        ok: true,
        model: "jev-1.13.0",
        answers: {
          cryptic: { type: "noul", noul: 0.12 },
          presumptuous: { type: "noul", noul: 0.91 },
          abstract: { type: "noul", noul: 0.8 },
        },
      },
      0.8,
    );
    assert.deepEqual(flags, { presumptuous: 0.91, abstract: 0.8 });
    assert.deepEqual(flaggedQuestions({ ok: false, reason: "HTTP 500" }, 0.8), {});
  });

  it("lists the questions models split on, and skips a sentence any model failed to judge", () => {
    const items = [
      { route: "/", sentence: "Your board will want the runway memo before Monday." },
      { route: "/trust", sentence: "Funding pressure is 71 against a line of 66." },
      { route: "/history", sentence: "Every model failed on this one sentence here." },
    ];
    const noul = (answers: Record<string, number>) => ({
      ok: true as const,
      model: "m",
      answers: Object.fromEntries(Object.entries(answers).map(([key, p]) => [key, { type: "noul" as const, noul: p }])),
    });
    const disagreements = findDisagreements(
      items,
      {
        jev: [noul({ presumptuous: 0.95, cryptic: 0.9 }), noul({ abstract: 0.1 }), noul({ cryptic: 0.9 })],
        "clef-flash": [noul({ presumptuous: 0.4, cryptic: 0.85 }), noul({ abstract: 0.2 }), { ok: false, reason: "HTTP 500" }],
      },
      0.8,
    );
    assert.deepEqual(disagreements, [
      { ...items[0], question: "presumptuous", flaggedBy: ["jev"], clearedBy: ["clef-flash"] },
    ]);
  });
});
