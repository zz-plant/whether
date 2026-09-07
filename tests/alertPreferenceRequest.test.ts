import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "bun:test";
import { saveAlertPreferences, ALERT_PREFERENCES_ENDPOINT } from "../app/components/alertPreferenceRequest";
import { requestBodyText, requestUrl } from "./fixtures/requestTarget";

/**
 * The alert channel toggles reported a preference as recorded whether or not
 * the write landed: the POST was fire-and-forget behind a `.catch()` that kept
 * the optimistic checkmark, and a 4xx or 5xx never reached the catch at all
 * because a rejected status still resolves.
 */

const originalFetch = globalThis.fetch;

/** Annotated rather than asserted, so the stub is checked against the real signature. */
const stubFetch = (handler: typeof fetch) => {
  globalThis.fetch = handler;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const preferences = { slack: true, email: false, webhook: false } as const;

describe("saveAlertPreferences", () => {
  it("reports success only when the endpoint accepts the write", async () => {
    let seen: { url: string; clientId: string | null; body: unknown } | null = null;

    stubFetch(async (input, init) => {
      const headers = new Headers(init?.headers);
      seen = {
        url: requestUrl(input),
        clientId: headers.get("x-whether-client-id"),
        body: JSON.parse(requestBodyText(init?.body)),
      };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    assert.equal(await saveAlertPreferences("client-1", { ...preferences }), true);
    assert.deepEqual(seen, {
      url: ALERT_PREFERENCES_ENDPOINT,
      clientId: "client-1",
      body: { clientId: "client-1", preferences: { slack: true, email: false, webhook: false } },
    });
  });

  it("reports failure on a rejected status, which resolves rather than throwing", async () => {
    for (const status of [400, 401, 500]) {
      stubFetch(async () => new Response("no", { status }));
      assert.equal(await saveAlertPreferences("client-1", { ...preferences }), false, `status ${status}`);
    }
  });

  it("reports failure when the request never completes", async () => {
    stubFetch(async () => {
      throw new Error("offline");
    });

    assert.equal(await saveAlertPreferences("client-1", { ...preferences }), false);
  });
});

describe("the alerts panel acts on that result", () => {
  it("reverts the toggle and surfaces a message instead of swallowing the failure", () => {
    const source = readFileSync(
      new URL("../app/components/regimeAlertsPanel.tsx", import.meta.url).pathname,
      "utf8",
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

    assert.match(code, /await saveAlertPreferences\(/, "awaits the shared request");
    assert.match(code, /setPreferences\(\(current\) => \(\{ \.\.\.current, \[channel\]: previousValue \}\)\)/,
      "reverts the one channel it failed to save");
    assert.match(code, /setPreferenceError\(/, "tells the reader the save did not land");
    assert.ok(
      !/fetch\("\/api\/alert-preferences",\s*\{\s*\n?\s*method: "POST"/.test(code),
      "no inline POST bypassing the shared request",
    );
  });
});
