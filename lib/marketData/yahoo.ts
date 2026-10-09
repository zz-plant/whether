/**
 * Yahoo Finance's quoteSummary endpoint: the comps' fallback when EDGAR or Cboe cannot answer.
 *
 * Unofficial and guarded. Since October 2026 it answers 429 to a request without a browser user
 * agent and 401 "Invalid Crumb" to one without a session, which is a cookie from fc.yahoo.com and
 * a crumb minted against that cookie at /v1/test/getcrumb. The flow answers from Cloudflare's
 * network (checked 2026-10-09 from a remote Worker session), though not from every address: the
 * same requests from a residential connection were refused at the crumb step.
 *
 * A session is minted once per basket and cached in KV for twelve hours. A quote answering 401
 * means the session has expired, so the basket mints one fresh session and retries only the
 * symbols that were refused.
 */

import { z } from "zod";
import type { KvNamespace } from "../runtime/kv";
import { getJson } from "../runtime/kv";
import { describeFetchError, releaseBody, type UpstreamRead } from "./upstream";

/* The endpoint refuses anything that does not look like a browser. */
const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const COOKIE_URL = "https://fc.yahoo.com/";
const CRUMB_URL = "https://query2.finance.yahoo.com/v1/test/getcrumb";
/* `formatted=false` returns plain numbers; without it every figure is a `{ raw, fmt }` object. */
const quoteUrl = (symbol: string, crumb: string) =>
  `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price,financialData,defaultKeyStatistics&formatted=false&crumb=${encodeURIComponent(crumb)}`;

/**
 * Validated rather than asserted: an undocumented endpoint that already answers with rate-limit
 * pages instead of quotes is not a shape to take on trust. A figure arrives as a number, or as a
 * `{ raw }` object if the format flag is ever ignored, and the upstream omits fields freely.
 */
const yahooNumber = z
  .union([z.number(), z.object({ raw: z.number().optional() }).transform((value) => value.raw)])
  .optional();

const yahooQuoteSchema = z.object({
  price: z.object({
    regularMarketPrice: yahooNumber,
    /* Every share class at the class's own price. `sharesOutstanding` counts one class, so
       price times shares understated Atlassian's market cap by a third. */
    marketCap: yahooNumber,
  }).optional(),
  defaultKeyStatistics: z.object({
    sharesOutstanding: yahooNumber,
  }).optional(),
  financialData: z.object({
    totalRevenue: yahooNumber,
    revenueGrowth: yahooNumber,
    totalDebt: yahooNumber,
    totalCash: yahooNumber,
  }).optional(),
});

const quoteResponseSchema = z.object({
  quoteSummary: z.object({
    result: z.array(yahooQuoteSchema).nonempty(),
  }),
});

export type YahooQuote = z.infer<typeof yahooQuoteSchema>;

/* ---------- Session: cookie and crumb ---------- */

type YahooSession = { cookie: string; crumb: string };

const SESSION_KEY = "comps:yahoo:session:v1";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const sessionSchema = z.object({ cookie: z.string().min(1), crumb: z.string().min(1) });

type SessionCache = Pick<KvNamespace, "get" | "put" | "delete">;

const readCachedSession = async (cache: SessionCache | null): Promise<YahooSession | null> => {
  if (!cache) return null;
  try {
    return await getJson(cache, SESSION_KEY, sessionSchema);
  } catch {
    return null;
  }
};

const writeCachedSession = async (cache: SessionCache | null, session: YahooSession) => {
  if (!cache) return;
  try {
    await cache.put(SESSION_KEY, JSON.stringify(session), { expirationTtl: SESSION_TTL_SECONDS });
  } catch {
    /* The next basket mints its own. */
  }
};

const forgetCachedSession = async (cache: SessionCache | null) => {
  try {
    await cache?.delete?.(SESSION_KEY);
  } catch {
    /* It expires on its own. */
  }
};

/* A crumb is a short opaque token. A rate-limit page or an HTML error answered with 200 is not one. */
const isPlausibleCrumb = (text: string) => text.length > 0 && text.length <= 64 && !/[\s<>{}]/.test(text);

/** Mints a session: the cookie fc.yahoo.com sets (it answers 404 while setting it), then a crumb for that cookie. */
const mintSession = async (): Promise<UpstreamRead<YahooSession>> => {
  let cookieResponse: Response;
  try {
    cookieResponse = await fetch(COOKIE_URL, {
      headers: { "user-agent": YAHOO_USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    return { status: "unavailable", reason: `Yahoo cookie: ${describeFetchError(error, "fetch failed")}` };
  }
  const cookie = cookieResponse.headers
    .getSetCookie()
    .map((line) => line.split(";")[0].trim())
    .filter((pair) => pair.includes("="))
    .join("; ");
  await releaseBody(cookieResponse);
  if (!cookie) return { status: "unavailable", reason: `Yahoo set no cookie (status ${cookieResponse.status})` };

  let crumbResponse: Response;
  try {
    crumbResponse = await fetch(CRUMB_URL, {
      headers: { "user-agent": YAHOO_USER_AGENT, cookie },
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    return { status: "unavailable", reason: `Yahoo crumb: ${describeFetchError(error, "fetch failed")}` };
  }
  if (!crumbResponse.ok) {
    await releaseBody(crumbResponse);
    return { status: "unavailable", reason: `Yahoo crumb returned ${crumbResponse.status}` };
  }
  const crumb = (await crumbResponse.text().catch(() => "")).trim();
  if (!isPlausibleCrumb(crumb)) return { status: "unavailable", reason: "Yahoo answered the crumb request without a crumb" };

  return { status: "ok", value: { cookie, crumb } };
};

/* ---------- Quotes ---------- */

/** A quote read, plus the one outcome that is about the session rather than the symbol. */
type QuoteAttempt = UpstreamRead<YahooQuote> | { status: "session-rejected" };

const fetchQuoteWithSession = async (symbol: string, session: YahooSession): Promise<QuoteAttempt> => {
  let res: Response;
  try {
    res = await fetch(quoteUrl(symbol, session.crumb), {
      headers: { "user-agent": YAHOO_USER_AGENT, cookie: session.cookie },
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    return { status: "unavailable", reason: `Yahoo: ${describeFetchError(error, "quote fetch failed")}` };
  }

  // 404 is a verdict about the symbol, 401 about the session. Everything else -- 429 rate
  // limiting, 5xx -- is the source declining to answer at all.
  if (res.status === 404) {
    await releaseBody(res);
    return { status: "missing", reason: `Yahoo has no quote for ${symbol}` };
  }
  if (res.status === 401) {
    await releaseBody(res);
    return { status: "session-rejected" };
  }
  if (!res.ok) {
    await releaseBody(res);
    return { status: "unavailable", reason: `Yahoo returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: "unavailable", reason: "Yahoo returned an unreadable body" };
  }

  const parsed = quoteResponseSchema.safeParse(body);
  return parsed.success
    ? { status: "ok", value: parsed.data.quoteSummary.result[0] }
    : { status: "missing", reason: `Yahoo's quote for ${symbol} has an unexpected shape` };
};

const settle = (attempt: QuoteAttempt): UpstreamRead<YahooQuote> =>
  attempt.status === "session-rejected"
    ? { status: "unavailable", reason: "Yahoo rejected the crumb" }
    : attempt;

/**
 * Quotes for a basket of symbols, in order. One session serves the basket; when a quote answers
 * 401 the cached session is replaced once and only the refused symbols are asked again.
 * Off Cloudflare (tests, scripts) there is no cache and every basket mints its own session.
 */
export async function fetchYahooQuotes(
  symbols: readonly string[],
  options: { cache: SessionCache | null },
): Promise<Array<UpstreamRead<YahooQuote>>> {
  const { cache } = options;
  const cached = await readCachedSession(cache);
  let session: YahooSession;
  if (cached) {
    session = cached;
  } else {
    const minted = await mintSession();
    if (minted.status !== "ok") return symbols.map(() => ({ status: "unavailable", reason: minted.reason }));
    session = minted.value;
    await writeCachedSession(cache, session);
  }

  const attempts = await Promise.all(symbols.map((symbol) => fetchQuoteWithSession(symbol, session)));
  if (!attempts.some((attempt) => attempt.status === "session-rejected")) return attempts.map(settle);

  const fresh = await mintSession();
  if (fresh.status !== "ok") {
    await forgetCachedSession(cache);
    return attempts.map((attempt) => attempt.status === "session-rejected"
      ? { status: "unavailable", reason: fresh.reason }
      : attempt);
  }

  const retried = await Promise.all(symbols.map(async (symbol, index) =>
    attempts[index].status === "session-rejected" ? fetchQuoteWithSession(symbol, fresh.value) : attempts[index],
  ));
  if (retried.some((attempt) => attempt.status === "session-rejected")) {
    await forgetCachedSession(cache);
  } else {
    await writeCachedSession(cache, fresh.value);
  }
  return retried.map(settle);
}
