import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import {
  BRIEF_SCREENSHOT_LATEST_KEY,
  BRIEF_SCREENSHOT_SELECTOR,
  BRIEF_SCREENSHOT_TTL_SECONDS,
  briefScreenshotUrl,
  captureAndStoreBriefScreenshot,
  readBriefScreenshot,
} from "../lib/export/briefScreenshot";
import { GET as screenshotGet } from "../app/api/image/brief-screenshot/route";
import { buildSlackBriefBlocks, deliverSlackBrief } from "../lib/slack/deliverSlackBrief";
import { requestBodyText, requestUrl } from "./fixtures/requestTarget";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 250, 251, 252]);

const createKv = () => {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key)?.value ?? null;
      },
      async put(key: string, value: string, options?: { expirationTtl?: number }) {
        store.set(key, { value, ttl: options?.expirationTtl });
      },
      async list() {
        return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true as const };
      },
    },
  };
};

const config = { accountId: "acct-1", token: "br-token" };

type Seen = { url: string; auth: string | null; body: Record<string, unknown> };
const screenshotApi = (respond: () => Response) => {
  const seen: Seen[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    seen.push({ url: requestUrl(input), auth: new Headers(init?.headers).get("authorization"), body: JSON.parse(requestBodyText(init?.body)) });
    return respond();
  };
  return { seen, fetcher };
};

const pngResponse = () => new Response(PNG, { status: 200, headers: { "content-type": "image/png" } });

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
});

describe("captureAndStoreBriefScreenshot", () => {
  it("reports itself skipped without credentials and never calls the API", async () => {
    const { seen, fetcher } = screenshotApi(pngResponse);
    const { kv } = createKv();
    const result = await captureAndStoreBriefScreenshot({ recordDate: "2026-09-14", config: null, fetcher, kv });
    assert.deepEqual(result, { ok: true, status: "skipped_unconfigured", recordDate: "2026-09-14" });
    assert.equal(seen.length, 0);
  });

  it("captures the weekly-call block in screenshot mode, stores it under the record date, and names its URL", async () => {
    const { seen, fetcher } = screenshotApi(pngResponse);
    const { kv, store } = createKv();

    const result = await captureAndStoreBriefScreenshot({
      recordDate: "2026-09-14",
      config,
      fetcher,
      kv,
      siteUrl: "https://whether.work",
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "stored");
    assert.equal(result.imageUrl, "https://whether.work/api/image/brief-screenshot?date=2026-09-14");
    assert.equal(result.imageUrl, briefScreenshotUrl("2026-09-14", "https://whether.work"));

    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.url, "https://api.cloudflare.com/client/v4/accounts/acct-1/browser-rendering/screenshot");
    assert.equal(seen[0]?.auth, "Bearer br-token");
    assert.equal(seen[0]?.body.url, "https://whether.work/?screenshot=1");
    assert.equal(seen[0]?.body.selector, BRIEF_SCREENSHOT_SELECTOR);
    assert.deepEqual(seen[0]?.body.viewport, { width: 1200, height: 900, deviceScaleFactor: 2 });

    assert.equal(store.get("artifact:brief-screenshot:2026-09-14")?.ttl, BRIEF_SCREENSHOT_TTL_SECONDS);
    assert.equal(store.get(BRIEF_SCREENSHOT_LATEST_KEY)?.value, "2026-09-14");
    assert.deepEqual(await readBriefScreenshot("2026-09-14", kv), PNG, "the bytes round-trip through KV");
    assert.deepEqual(await readBriefScreenshot("latest", kv), PNG);
    assert.equal(await readBriefScreenshot("2026-09-07", kv), null);
  });

  it("reports a refused capture or a non-image answer as failed and stores nothing", async () => {
    const { kv, store } = createKv();

    const throttled = screenshotApi(() => new Response("slow down", { status: 429 }));
    const refused = await captureAndStoreBriefScreenshot({ recordDate: "2026-09-14", config, fetcher: throttled.fetcher, kv });
    assert.equal(refused.ok, false);
    assert.equal(refused.status, "failed");
    assert.match(refused.error ?? "", /429/);

    const html = screenshotApi(() => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    const notImage = await captureAndStoreBriefScreenshot({ recordDate: "2026-09-14", config, fetcher: html.fetcher, kv });
    assert.equal(notImage.ok, false);
    assert.match(notImage.error ?? "", /not an image/);

    assert.equal(store.size, 0);
  });

  it("refuses a record date that is not a date, before spending browser time", async () => {
    const { seen, fetcher } = screenshotApi(pngResponse);
    const { kv } = createKv();
    const result = await captureAndStoreBriefScreenshot({ recordDate: "this week", config, fetcher, kv });
    assert.equal(result.ok, false);
    assert.equal(seen.length, 0);
  });
});

describe("GET /api/image/brief-screenshot", () => {
  it("serves the stored PNG for a date and for latest, and 404s for a week without one", async () => {
    const { kv } = createKv();
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", kv);
    const { fetcher } = screenshotApi(pngResponse);
    await captureAndStoreBriefScreenshot({ recordDate: "2026-09-14", config, fetcher, kv });

    const dated = await screenshotGet(new Request("https://whether.work/api/image/brief-screenshot?date=2026-09-14"));
    assert.equal(dated.status, 200);
    assert.equal(dated.headers.get("content-type"), "image/png");
    assert.match(dated.headers.get("cache-control") ?? "", /s-maxage=86400/);
    assert.deepEqual(new Uint8Array(await dated.arrayBuffer()), PNG);

    const latest = await screenshotGet(new Request("https://whether.work/api/image/brief-screenshot"));
    assert.equal(latest.status, 200);
    assert.match(latest.headers.get("cache-control") ?? "", /s-maxage=900/);

    const missing = await screenshotGet(new Request("https://whether.work/api/image/brief-screenshot?date=2026-09-07"));
    assert.equal(missing.status, 404);

    const malformed = await screenshotGet(new Request("https://whether.work/api/image/brief-screenshot?date=../etc"));
    assert.equal(malformed.status, 400);
  });
});

describe("Slack post with the screenshot", () => {
  it("places the image block right after the header when a URL is given, and omits it otherwise", () => {
    const withImage = buildSlackBriefBlocks("Posture: Guarded", "2026-09-14", { imageUrl: "https://whether.work/api/image/brief-screenshot?date=2026-09-14" });
    assert.equal(withImage[0]?.type, "header");
    assert.equal(withImage[1]?.type, "image");
    assert.equal(withImage[2]?.type, "section");

    const textOnly = buildSlackBriefBlocks("Posture: Guarded", "2026-09-14");
    assert.deepEqual(textOnly.map((block) => block.type), ["header", "section", "actions"]);
  });

  it("posts the image URL to the webhook", async () => {
    let sentBody = "";
    const capture: typeof fetch = async (_url, init) => {
      sentBody = requestBodyText(init?.body);
      return new Response("ok", { status: 200 });
    };

    const result = await deliverSlackBrief({
      webhookUrls: ["https://hooks.slack.com/services/T0/B0/x"],
      payload: { text: "Posture: Guarded", recordDate: "2026-09-14" },
      imageUrl: "https://whether.work/api/image/brief-screenshot?date=2026-09-14",
      fetchImpl: capture,
    });

    assert.equal(result.status, "posted");
    assert.match(sentBody, /"type":"image"/);
    assert.match(sentBody, /brief-screenshot\?date=2026-09-14/);
  });
});
