import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock, spyOn } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/webhooks/slack/actions/route";
import {
  SLACK_SIGNATURE_TOLERANCE_SECONDS,
  verifySlackSignature,
} from "../lib/api/slackSignature";
import { slackSignatureHeaders } from "./fixtures/slackSignature";

const SECRET = "slack-signing-secret-under-test";
const RESPONSE_URL = "https://hooks.slack.com/actions/T000/B000/abc";
const ROUTE_URL = "http://localhost/api/webhooks/slack/actions";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_SECRET = process.env.SLACK_SIGNING_SECRET;

const actionPayload = JSON.stringify({
  type: "block_actions",
  user: { id: "U123", username: "sarah" },
  actions: [{ action_id: "acknowledge_decision", value: "dm_12345" }],
  response_url: RESPONSE_URL,
});

const nowSeconds = () => Math.floor(Date.now() / 1000);

const post = (body: string, headers: Record<string, string>) =>
  POST(new NextRequest(ROUTE_URL, { method: "POST", headers, body }));

const postJson = (body: string, headers: Record<string, string>) =>
  post(body, { "content-type": "application/json", ...headers });

const stubFetch = () =>
  spyOn(globalThis, "fetch").mockImplementation(async () => new Response("ok", { status: 200 }));

const setNodeEnv = (value: string | undefined) => {
  // Next declares NODE_ENV readonly on ProcessEnv; the runtime value is a plain string.
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
  } else {
    Reflect.set(process.env, "NODE_ENV", value);
  }
};

beforeEach(() => {
  process.env.SLACK_SIGNING_SECRET = SECRET;
  Reflect.deleteProperty(globalThis, "SLACK_SIGNING_SECRET");
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.SLACK_SIGNING_SECRET;
  } else {
    process.env.SLACK_SIGNING_SECRET = ORIGINAL_SECRET;
  }
  Reflect.deleteProperty(globalThis, "SLACK_SIGNING_SECRET");
  mock.restore();
});

describe("POST /api/webhooks/slack/actions signature verification", () => {
  it("accepts a request Slack signed and posts the confirmation to its response_url", async () => {
    const fetchMock = stubFetch();

    const response = await postJson(actionPayload, slackSignatureHeaders(actionPayload, SECRET));

    assert.equal(response.status, 200);
    const body: { ok: boolean; action: string; decisionId: string } = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.action, "acknowledge_decision");
    assert.equal(body.decisionId, "dm_12345");
    assert.equal(fetchMock.mock.calls.length, 1);
    // The route hands fetch the string from the payload, so the target compares as one.
    assert.equal(fetchMock.mock.calls[0][0], RESPONSE_URL);
    // Awaited before the route answers, inside Slack's three-second window, so it is bounded.
    const init: unknown = fetchMock.mock.calls[0][1];
    assert.ok(typeof init === "object" && init !== null && Reflect.get(init, "signal") instanceof AbortSignal);
  });

  it("verifies the signature over the raw form body Slack actually sends", async () => {
    const fetchMock = stubFetch();
    const formBody = new URLSearchParams({ payload: actionPayload }).toString();

    const response = await post(formBody, {
      "content-type": "application/x-www-form-urlencoded",
      ...slackSignatureHeaders(formBody, SECRET),
    });

    assert.equal(response.status, 200);
    const body: { action: string; decisionId: string } = await response.json();
    assert.equal(body.action, "acknowledge_decision");
    assert.equal(body.decisionId, "dm_12345");
    assert.equal(fetchMock.mock.calls.length, 1);
  });

  it("rejects a signature made with another secret and never touches response_url", async () => {
    const fetchMock = stubFetch();

    const response = await postJson(actionPayload, slackSignatureHeaders(actionPayload, "not-the-secret"));

    assert.equal(response.status, 401);
    const body: { ok: boolean; error: string } = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, "invalid_signature");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("rejects a body that changed after it was signed", async () => {
    const fetchMock = stubFetch();
    const headers = slackSignatureHeaders(actionPayload, SECRET);
    const tampered = actionPayload.replace(RESPONSE_URL, "https://attacker.example/collect");

    const response = await postJson(tampered, headers);

    assert.equal(response.status, 401);
    const body: { error: string } = await response.json();
    assert.equal(body.error, "invalid_signature");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("ignores a validly signed payload's response_url when it is not on hooks.slack.com", async () => {
    const fetchMock = stubFetch();
    const warnMock = spyOn(console, "warn").mockImplementation(() => {});
    const elsewhere = [
      "https://attacker.example/collect",
      "https://hooks.slack.com.attacker.example/actions/T000/B000/abc",
      "http://hooks.slack.com/actions/T000/B000/abc",
    ];

    for (const responseUrl of elsewhere) {
      const payload = actionPayload.replace(RESPONSE_URL, responseUrl);
      const response = await postJson(payload, slackSignatureHeaders(payload, SECRET));

      assert.equal(response.status, 200, responseUrl);
      const body: { ok: boolean; action: string } = await response.json();
      assert.equal(body.ok, true);
      assert.equal(body.action, "acknowledge_decision");
    }

    assert.equal(fetchMock.mock.calls.length, 0);
    assert.equal(warnMock.mock.calls.length, elsewhere.length);
    // The warning names the origin, never the path the sender chose.
    for (const [message] of warnMock.mock.calls) {
      assert.doesNotMatch(String(message), /collect|T000/);
    }
  });

  it("does not throw on a response_url that is not a URL at all", async () => {
    const fetchMock = stubFetch();
    spyOn(console, "warn").mockImplementation(() => {});
    const payload = actionPayload.replace(RESPONSE_URL, "not a url");

    const response = await postJson(payload, slackSignatureHeaders(payload, SECRET));

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("rejects a request carrying no Slack headers at all", async () => {
    const fetchMock = stubFetch();

    const response = await postJson(actionPayload, {});

    assert.equal(response.status, 401);
    const body: { error: string } = await response.json();
    assert.equal(body.error, "missing_signature");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("rejects a correctly signed request whose timestamp is older than five minutes", async () => {
    const fetchMock = stubFetch();
    const stale = String(nowSeconds() - SLACK_SIGNATURE_TOLERANCE_SECONDS - 1);

    const response = await postJson(actionPayload, slackSignatureHeaders(actionPayload, SECRET, stale));

    assert.equal(response.status, 401);
    const body: { error: string } = await response.json();
    assert.equal(body.error, "stale_timestamp");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("answers 503 in production when no signing secret is configured", async () => {
    const fetchMock = stubFetch();
    delete process.env.SLACK_SIGNING_SECRET;
    setNodeEnv("production");

    const response = await postJson(actionPayload, slackSignatureHeaders(actionPayload, SECRET));

    assert.equal(response.status, 503);
    const body: { ok: boolean; error: string } = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, "slack_signing_secret_not_configured");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("accepts an unsigned request outside production when no secret is configured", async () => {
    const fetchMock = stubFetch();
    delete process.env.SLACK_SIGNING_SECRET;
    assert.notEqual(process.env.NODE_ENV, "production");

    const response = await postJson(actionPayload, {});

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.calls.length, 1);
  });

  it("reads the secret from globalThis before process.env, like the other bindings", async () => {
    stubFetch();
    Reflect.set(globalThis, "SLACK_SIGNING_SECRET", "secret-from-binding");

    const signedWithBinding = await postJson(
      actionPayload,
      slackSignatureHeaders(actionPayload, "secret-from-binding"),
    );
    assert.equal(signedWithBinding.status, 200);

    const signedWithEnv = await postJson(actionPayload, slackSignatureHeaders(actionPayload, SECRET));
    assert.equal(signedWithEnv.status, 401);
  });
});

describe("verifySlackSignature", () => {
  it("treats a timestamp from the future as stale too", async () => {
    const early = String(nowSeconds() + SLACK_SIGNATURE_TOLERANCE_SECONDS + 1);
    const headers = slackSignatureHeaders(actionPayload, SECRET, early);

    const verdict = await verifySlackSignature({
      rawBody: actionPayload,
      timestampHeader: headers["x-slack-request-timestamp"],
      signatureHeader: headers["x-slack-signature"],
      secret: SECRET,
    });

    assert.deepEqual(verdict, { ok: false, error: "stale_timestamp" });
  });

  it("accepts a timestamp exactly at the tolerance boundary", async () => {
    const now = 1_700_000_000;
    const boundary = String(now - SLACK_SIGNATURE_TOLERANCE_SECONDS);
    const headers = slackSignatureHeaders(actionPayload, SECRET, boundary);

    const verdict = await verifySlackSignature({
      rawBody: actionPayload,
      timestampHeader: headers["x-slack-request-timestamp"],
      signatureHeader: headers["x-slack-signature"],
      secret: SECRET,
      nowSeconds: now,
    });

    assert.deepEqual(verdict, { ok: true });
  });

  it("rejects a timestamp that is not an integer before doing any clock math", async () => {
    const verdict = await verifySlackSignature({
      rawBody: actionPayload,
      timestampHeader: "soon",
      signatureHeader: "v0=deadbeef",
      secret: SECRET,
    });

    assert.deepEqual(verdict, { ok: false, error: "invalid_signature" });
  });
});
