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
import {
  fetchSecRestructurings,
  readSecCompanyFigures,
  secCompanyFiguresSchema,
  secRestructuringFilingSchema,
} from "../marketData/secEdgar";
import { medianOf, type PeerGrowth } from "../report/companySituation";
import { getJson, getWhetherKv, type KvNamespace } from "../runtime/kv";
import { COMPANIES, type CompanyEntry } from "./companyRegistry";

const KEY_PREFIX = "companies:filing:v2:";
const REFRESH_BATCH_SIZE = 8;
const MS_PER_DAY = 86_400_000;

const companyRecordSchema = secCompanyFiguresSchema.extend({ restructurings: z.array(secRestructuringFilingSchema) });
type CompanyRecord = z.infer<typeof companyRecordSchema>;

const bundled = z.record(z.string(), companyRecordSchema).parse(bundledFilings.filings);

type FilingStore = Pick<KvNamespace, "get" | "put">;

const readStored = async (store: FilingStore | null, company: CompanyEntry): Promise<CompanyRecord | null> => {
  if (!store) return null;
  try {
    return await getJson(store, KEY_PREFIX + company.ticker, companyRecordSchema);
  } catch {
    return null;
  }
};

export const readCompanyRecord = async (
  company: CompanyEntry,
  store: FilingStore | null = getWhetherKv(),
): Promise<CompanyRecord | null> => (await readStored(store, company)) ?? bundled[company.ticker] ?? null;

/**
 * The list's median revenue growth, from the bundled copy. A reading is compared with it, and a
 * snapshot that moves only when it is regenerated keeps every page comparing with the same number.
 */
export const pilotPeerGrowth = (): PeerGrowth | null => {
  const growth = COMPANIES.flatMap((company) => {
    const value = bundled[company.ticker]?.revenueGrowth;
    return typeof value === "number" ? [value] : [];
  });
  const median = medianOf(growth);
  return median === null ? null : { median, companies: COMPANIES.length };
};

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
    const restructurings = figures.status === "ok" ? await fetchSecRestructurings(company.cik, now) : null;
    /* Both or neither: a record without the restructuring read would say a company had filed none. */
    if (figures.status === "ok" && restructurings?.status === "ok") {
      const record: CompanyRecord = { ...figures.value, restructurings: restructurings.value };
      await store.put(KEY_PREFIX + company.ticker, JSON.stringify(record));
      refreshed += 1;
    } else if (figures.status !== "ok") {
      lastFailure = `${company.ticker}: ${figures.status === "refused" ? figures.refusal : figures.reason}`;
    } else {
      lastFailure = `${company.ticker}: restructuring filings could not be read`;
    }
  }
  /* A single company's refusal is a fact about it. Nothing at all is the source being down. */
  return refreshed > 0 || due.length === 0 ? { ok: true, refreshed } : { ok: false, error: lastFailure, refreshed };
};
