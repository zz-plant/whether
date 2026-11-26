import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { INDEXNOW_SUBMITTED_KEY, syncSitemapToIndexNow } from "../lib/seo/indexNowSitemapSync";

/*
 * The daily IndexNow sync (2026-11-26). Only the answer publish route pinged IndexNow, so a
 * merged week or a new month on /history waited for a crawler to reread the sitemap.
 */

const memoryKv = () => {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

const accepting = () => {
  const calls: string[][] = [];
  const submit = async (urls: readonly string[]) => {
    calls.push([...urls]);
    return { submitted: urls.length, status: 202 };
  };
  return { calls, submit };
};

const entries = [
  { url: "https://whether.work", lastModified: "2026-11-24T02:00:00.000Z" },
  { url: "https://whether.work/brief/2026-w47", lastModified: new Date("2026-11-24T14:00:00.000Z") },
  { url: "https://whether.work/history", lastModified: "2026-11-24T02:00:00.000Z" },
];

describe("syncing the sitemap to IndexNow", () => {
  it("sends the whole sitemap once, then nothing while no date moves", async () => {
    const kv = memoryKv();
    const { calls, submit } = accepting();

    const first = await syncSitemapToIndexNow({ entries, kv, submit });
    assert.deepEqual(first, { ok: true, submitted: 3, changed: 3 });
    assert.deepEqual(calls[0], entries.map((entry) => entry.url));

    const second = await syncSitemapToIndexNow({ entries, kv, submit });
    assert.deepEqual(second, { ok: true, submitted: 0, changed: 0 });
    assert.equal(calls.length, 1, "an unchanged sitemap sends nothing");
  });

  it("sends only a new URL and one whose date moved", async () => {
    const kv = memoryKv();
    const { calls, submit } = accepting();
    await syncSitemapToIndexNow({ entries, kv, submit });

    const next = [
      { ...entries[0], url: "https://whether.work", lastModified: "2026-12-01T02:00:00.000Z" },
      ...entries.slice(1),
      { url: "https://whether.work/brief/2026-w48", lastModified: "2026-12-01T14:00:00.000Z" },
    ];
    const result = await syncSitemapToIndexNow({ entries: next, kv, submit });
    assert.equal(result.submitted, 2);
    assert.deepEqual(calls[1], ["https://whether.work", "https://whether.work/brief/2026-w48"]);
  });

  it("records nothing when IndexNow refuses, so the next run retries", async () => {
    const kv = memoryKv();
    const refused = async () => ({ submitted: 0, status: 403 });
    const result = await syncSitemapToIndexNow({ entries, kv, submit: refused });
    assert.deepEqual(result, { ok: false, submitted: 0, changed: 3, error: "IndexNow answered 403" });
    assert.equal(kv.store.has(INDEXNOW_SUBMITTED_KEY), false);
  });

  it("records nothing without a key, and reports the skip rather than a failure", async () => {
    const kv = memoryKv();
    const keyless = async () => ({ submitted: 0, skipped: "no INDEXNOW_KEY" });
    const result = await syncSitemapToIndexNow({ entries, kv, submit: keyless });
    assert.equal(result.ok, true);
    assert.equal(result.skipped, "no INDEXNOW_KEY");
    assert.equal(kv.store.has(INDEXNOW_SUBMITTED_KEY), false);
  });

  it("drops a URL that left the sitemap from the record", async () => {
    const kv = memoryKv();
    const { submit } = accepting();
    await syncSitemapToIndexNow({ entries, kv, submit });
    await syncSitemapToIndexNow({ entries: entries.slice(0, 2), kv, submit });
    const record: Record<string, string> = JSON.parse(kv.store.get(INDEXNOW_SUBMITTED_KEY) ?? "{}");
    assert.deepEqual(Object.keys(record), entries.slice(0, 2).map((entry) => entry.url));
  });

  it("runs on the daily cron from the in-process sitemap, never a fetch of the site", () => {
    const worker = readFileSync("worker/index.ts", "utf8");
    assert.match(worker, /step\("seo\/indexnow-sync"/);
    assert.match(worker, /syncSitemapToIndexNow\(\{ entries: await sitemap\(\), kv \}\)/);
    assert.match(worker, /import sitemap from "\.\.\/app\/sitemap"/);
  });
});
