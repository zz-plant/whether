import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { z } from "zod";
import {
  buildStreamQuery,
  isDatasetName,
  queryAnalyticsEngine,
  queryWindowPaged,
  resolveAnalyticsReadConfig,
  splitWindow,
} from "../lib/telemetry/analyticsQuery";
import { requestUrl } from "./fixtures/requestTarget";

const originalEnv = { ...process.env };
const rowSchema = z.object({ blob2: z.string().nullable().optional() });
const config = { accountId: "acct", token: "tok", dataset: "whether_telemetry" };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ blob2: `row-${index}` }));

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("analytics read config", () => {
  beforeEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.WHETHER_TELEMETRY_DATASET;
  });

  /*
   * The two readers accepted different token names for the same permission, so
   * a machine configured for one reported "unconfigured" to the other.
   */
  it("accepts either token name", () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN = "binding-token";
    assert.equal(resolveAnalyticsReadConfig()?.token, "binding-token");

    delete process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
    process.env.CLOUDFLARE_API_TOKEN = "script-token";
    assert.equal(resolveAnalyticsReadConfig()?.token, "script-token");
  });

  it("refuses a dataset name that is not an identifier", () => {
    assert.ok(isDatasetName("whether_telemetry"));
    assert.ok(!isDatasetName("x; DROP TABLE y"));

    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "tok";
    process.env.WHETHER_TELEMETRY_DATASET = "x; DROP TABLE y";
    assert.equal(resolveAnalyticsReadConfig(), null);
  });

  it("is unconfigured without both halves", () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    assert.equal(resolveAnalyticsReadConfig(), null);
  });
});

describe("queryAnalyticsEngine", () => {
  it("reports whether the row cap was reached, so a clipped answer is not read as complete", async () => {
    const clipped = await queryAnalyticsEngine({
      config,
      rowSchema,
      rowLimit: 3,
      sql: "SELECT 1",
      fetcher: async () => jsonResponse({ data: rows(3) }),
    });
    assert.equal(clipped.ok && clipped.truncated, true);

    const complete = await queryAnalyticsEngine({
      config,
      rowSchema,
      rowLimit: 3,
      sql: "SELECT 1",
      fetcher: async () => jsonResponse({ data: rows(2) }),
    });
    assert.equal(complete.ok && complete.truncated, false);
  });

  it("carries the token in the header and the account id in the path", async () => {
    let seenUrl = "";
    let seenAuth = "";
    await queryAnalyticsEngine({
      config: { ...config, accountId: "acct/../other" },
      rowSchema,
      rowLimit: 10,
      sql: "SELECT 1",
      fetcher: async (url, init) => {
        seenUrl = requestUrl(url);
        // `new Headers` narrows HeadersInit at runtime; an assertion would only move the risk.
        seenAuth = new Headers(init?.headers).get("authorization") ?? "";
        return jsonResponse({ data: [] });
      },
    });

    assert.ok(seenUrl.includes("acct%2F..%2Fother"), `account id is encoded (${seenUrl})`);
    assert.ok(!seenUrl.includes("tok"), "the token never reaches the URL");
    assert.equal(seenAuth, "Bearer tok");
  });

  it("returns a reason rather than throwing on an error status or a surprise payload", async () => {
    const http = await queryAnalyticsEngine({
      config, rowSchema, rowLimit: 10, sql: "SELECT 1",
      fetcher: async () => new Response("nope", { status: 403 }),
    });
    assert.equal(http.ok, false);
    assert.match(http.ok ? "" : http.reason, /HTTP 403/);

    const shape = await queryAnalyticsEngine({
      config, rowSchema, rowLimit: 10, sql: "SELECT 1",
      fetcher: async () => jsonResponse({ data: [{ blob2: 42 }] }),
    });
    assert.equal(shape.ok, false);
    assert.match(shape.ok ? "" : shape.reason, /unexpected payload/);
  });
});

describe("buildStreamQuery", () => {
  it("bounds the read to one stream and one half-open window", () => {
    const sql = buildStreamQuery({
      dataset: "whether_telemetry",
      stream: "content-measurement",
      window: { startIso: "2026-09-01T00:00:00.000Z", endIso: "2026-09-08T00:00:00.000Z" },
      limit: 500,
    });

    assert.match(sql, /WHERE index1 = 'content-measurement'/);
    assert.match(sql, /timestamp >= toDateTime\('2026-09-01 00:00:00'\)/);
    assert.match(sql, /timestamp < toDateTime\('2026-09-08 00:00:00'\)/);
    assert.match(sql, /LIMIT 500/);
  });
});

describe("splitWindow", () => {
  it("splits into consecutive slices that cover the whole window", () => {
    const window = { startIso: "2026-09-01T00:00:00.000Z", endIso: "2026-09-05T00:00:00.000Z" };
    const slices = splitWindow(window, 4);

    assert.equal(slices.length, 4);
    assert.equal(slices[0].startIso, window.startIso);
    assert.equal(slices[3].endIso, window.endIso);
    for (let index = 1; index < slices.length; index += 1) {
      assert.equal(slices[index].startIso, slices[index - 1].endIso, "no gap between slices");
    }
  });

  it("returns the window unchanged when it cannot be split", () => {
    const window = { startIso: "2026-09-01T00:00:00.000Z", endIso: "2026-09-01T00:00:00.000Z" };
    assert.deepEqual(splitWindow(window, 4), [window]);
  });
});

describe("queryWindowPaged", () => {
  const window = { startIso: "2026-09-01T00:00:00.000Z", endIso: "2026-10-01T00:00:00.000Z" };

  it("narrows a clipped window until every slice comes back whole", async () => {
    let calls = 0;
    const result = await queryWindowPaged<typeof rowSchema>({
      window,
      minSliceMs: 15 * 60 * 1000,
      run: async () => {
        calls += 1;
        return calls === 1
          ? { ok: true, rows: rows(5), truncated: true }
          : { ok: true, rows: rows(2), truncated: false };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.ok ? result.rows.length : 0, 8, "four slices of two, the clipped read discarded");
    assert.equal(calls, 5);
  });

  it("stops splitting below the minimum slice and says the cap is the constraint", async () => {
    const result = await queryWindowPaged<typeof rowSchema>({
      window,
      minSliceMs: 15 * 60 * 1000,
      run: async () => ({ ok: true, rows: rows(5), truncated: true }),
    });

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.reason, /row cap/);
  });

  it("stops at the query budget rather than fanning out without bound", async () => {
    const result = await queryWindowPaged<typeof rowSchema>({
      window,
      minSliceMs: 1,
      maxQueries: 6,
      run: async () => ({ ok: true, rows: rows(5), truncated: true }),
    });

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.reason, /more than 6 queries/);
  });

  it("surfaces a transport failure instead of returning a partial set", async () => {
    const result = await queryWindowPaged<typeof rowSchema>({
      window,
      minSliceMs: 15 * 60 * 1000,
      run: async () => ({ ok: false, reason: "Analytics Engine answered HTTP 500" }),
    });

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.reason, /HTTP 500/);
  });
});
