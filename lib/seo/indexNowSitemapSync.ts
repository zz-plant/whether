import { z } from "zod";
import { getJson, type KvNamespace } from "../runtime/kv";
import { submitIndexNow } from "./indexNow";

/**
 * Tell IndexNow (Bing, Yandex, and the search Bing serves to ChatGPT and DuckDuckGo) about
 * every sitemap URL that is new or whose `lastModified` moved since the last run.
 *
 * Until 2026-11-26 only the answer publish route pinged IndexNow. A new published week
 * (`/brief/<week>`), a new month on /history or a refreshed archive period reached a
 * crawler only when it next read the sitemap. The daily cron runs this after the sitemap
 * has the day's dates: the first run sends the whole sitemap once, and later runs send
 * only what changed, which is what the protocol asks for.
 *
 * The record of what was sent is written only after IndexNow accepts the batch (200 or
 * 202), so a refused or failed request is retried the next day rather than forgotten.
 * Without `INDEXNOW_KEY` nothing is sent and nothing is recorded.
 */
export const INDEXNOW_SUBMITTED_KEY = "seo:indexnow:submitted-lastmod";

/** The protocol's ceiling for one request. */
const INDEXNOW_MAX_URLS = 10_000;

const submittedSchema = z.record(z.string(), z.string());

type SitemapEntry = { url: string; lastModified?: string | Date | null };

type SyncResult = { ok: boolean; submitted: number; changed: number; error?: string; skipped?: string };

const lastModifiedKey = (value: SitemapEntry["lastModified"]): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

export const syncSitemapToIndexNow = async ({
  entries,
  kv,
  submit = submitIndexNow,
}: {
  entries: readonly SitemapEntry[];
  kv: Pick<KvNamespace, "get" | "put">;
  submit?: typeof submitIndexNow;
}): Promise<SyncResult> => {
  const current: Record<string, string> = {};
  for (const entry of entries) current[entry.url] = lastModifiedKey(entry.lastModified);

  const previous = (await getJson(kv, INDEXNOW_SUBMITTED_KEY, submittedSchema)) ?? {};
  const changed = Object.keys(current).filter((url) => previous[url] !== current[url]);
  if (changed.length === 0) {
    /* Nothing to send; a URL that left the sitemap still leaves the record, so it is sent
       again if it ever comes back. */
    if (Object.keys(previous).some((url) => !(url in current))) {
      await kv.put(INDEXNOW_SUBMITTED_KEY, JSON.stringify(current));
    }
    return { ok: true, submitted: 0, changed: 0 };
  }

  const batch = changed.slice(0, INDEXNOW_MAX_URLS);
  const result = await submit(batch);
  if (result.skipped) return { ok: true, submitted: 0, changed: changed.length, skipped: result.skipped };
  if (result.status !== 200 && result.status !== 202) {
    return { ok: false, submitted: 0, changed: changed.length, error: `IndexNow answered ${result.status ?? "nothing"}` };
  }

  /* Record only what was sent; anything past the ceiling goes in the next run. URLs that left
     the sitemap drop out of the record with it. */
  const sent = new Set(batch);
  const record: Record<string, string> = {};
  for (const [url, lastModified] of Object.entries(current)) {
    if (sent.has(url)) record[url] = lastModified;
    else if (previous[url] === lastModified) record[url] = lastModified;
  }
  await kv.put(INDEXNOW_SUBMITTED_KEY, JSON.stringify(record));
  return { ok: true, submitted: batch.length, changed: changed.length };
};
