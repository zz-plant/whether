/**
 * Each pilot company's latest filed figures, for pages to read and never to fetch.
 *
 * A page reads KV and falls back to the bundled copy, so it never waits on the SEC or holds a
 * few megabytes of JSON in a read. The daily cron refreshes a few companies each run, which
 * covers the list inside a week against filings that arrive quarterly. A refusal or an outage
 * leaves the last good figures in place, and the page's date says how old they are.
 */
import { z } from "zod";
import bundledFilings from "../../data/company_filings.json";
import { readSecCompanyFigures, secCompanyFiguresSchema, type SecCompanyFigures } from "../marketData/secEdgar";
import { getJson, getWhetherKv, type KvNamespace } from "../runtime/kv";
import { COMPANIES, type CompanyEntry } from "./companyRegistry";

const KEY_PREFIX = "companies:filing:v1:";
const REFRESH_BATCH_SIZE = 8;
const MS_PER_DAY = 86_400_000;

const bundled = z.record(z.string(), secCompanyFiguresSchema).parse(bundledFilings.filings);

type FilingStore = Pick<KvNamespace, "get" | "put">;

const readStored = async (store: FilingStore | null, company: CompanyEntry): Promise<SecCompanyFigures | null> => {
  if (!store) return null;
  try {
    return await getJson(store, KEY_PREFIX + company.ticker, secCompanyFiguresSchema);
  } catch {
    return null;
  }
};

export const readCompanyFigures = async (
  company: CompanyEntry,
  store: FilingStore | null = getWhetherKv(),
): Promise<SecCompanyFigures | null> => (await readStored(store, company)) ?? bundled[company.ticker] ?? null;

/** Who is due today: a stretch of the list that moves on each day, so every company comes round. */
const companiesDue = (now: Date): CompanyEntry[] => {
  const day = Math.floor(now.getTime() / MS_PER_DAY);
  return Array.from({ length: Math.min(REFRESH_BATCH_SIZE, COMPANIES.length) }, (_unused, index) =>
    COMPANIES[(day * REFRESH_BATCH_SIZE + index) % COMPANIES.length],
  ).filter((company): company is CompanyEntry => company !== undefined);
};

/** One at a time: each filing is a few megabytes of JSON against a Worker's 128MB. */
export const refreshCompanyFilings = async ({
  store = getWhetherKv(),
  now = new Date(),
}: { store?: FilingStore | null; now?: Date } = {}): Promise<{ ok: boolean; error?: string; refreshed: number }> => {
  if (!store) return { ok: true, refreshed: 0 };
  let refreshed = 0;
  let lastFailure: string | undefined;
  const due = companiesDue(now);
  for (const company of due) {
    const figures = await readSecCompanyFigures(company.cik, { cache: null, now });
    if (figures.status === "ok") {
      await store.put(KEY_PREFIX + company.ticker, JSON.stringify(figures.value));
      refreshed += 1;
    } else {
      lastFailure = `${company.ticker}: ${figures.status === "refused" ? figures.refusal : figures.reason}`;
    }
  }
  /* A single company's refusal is a fact about it. Nothing at all is the source being down. */
  return refreshed > 0 || due.length === 0 ? { ok: true, refreshed } : { ok: false, error: lastFailure, refreshed };
};
