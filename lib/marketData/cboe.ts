/**
 * Delayed share prices from Cboe's public quote feed.
 *
 * SEC EDGAR has every fundamental the comps need and no price. Cboe publishes a fifteen-minute
 * delayed quote for every optionable US stock as a static JSON file on its CDN, the file its own
 * quote pages read: no key, no cookie, no user-agent test. It is not a documented API, so the body
 * is validated rather than trusted and a refusal is reported as one.
 *
 * An unknown symbol is a 403 from the storage bucket behind the CDN, with an S3 `AccessDenied`
 * body, rather than a 404. That body is the tell: a 403 without it is the CDN refusing us, and
 * reads as unavailable.
 */

import { z } from "zod";
import { describeFetchError, releaseBody, type UpstreamRead } from "./upstream";

const cboeQuoteUrl = (symbol: string) =>
  `https://cdn.cboe.com/api/global/delayed_quotes/quotes/${encodeURIComponent(symbol)}.json`;

/** A quote file left behind by a delisted symbol keeps its last price; a week without a trade is not a current price. */
const STALE_TRADE_DAYS = 7;

const optionalNumber = z.number().nullable().optional();

const cboeQuoteSchema = z.object({
  data: z.object({
    symbol: z.string(),
    current_price: optionalNumber,
    close: optionalNumber,
    prev_day_close: optionalNumber,
    /* Exchange-local time without a zone, e.g. "2026-10-08T15:59:59". Only its date is read. */
    last_trade_time: z.string().nullable().optional(),
  }),
});

const firstPositive = (...values: Array<number | null | undefined>): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return null;
};

/** The latest delayed price for one symbol, in dollars. */
export async function fetchCboeDelayedPrice(symbol: string, now: Date = new Date()): Promise<UpstreamRead<number>> {
  let res: Response;
  try {
    res = await fetch(cboeQuoteUrl(symbol), { signal: AbortSignal.timeout(4000) });
  } catch (error) {
    return { status: "unavailable", reason: `Cboe: ${describeFetchError(error, "price fetch failed")}` };
  }

  if (res.status === 403 || res.status === 404) {
    const body = await res.text().catch(() => "");
    if (res.status === 404 || body.includes("<Code>AccessDenied</Code>")) {
      return { status: "missing", reason: `Cboe has no quote for ${symbol}` };
    }
    return { status: "unavailable", reason: "Cboe returned 403" };
  }
  if (!res.ok) {
    await releaseBody(res);
    return { status: "unavailable", reason: `Cboe returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { status: "unavailable", reason: "Cboe returned an unreadable body" };
  }

  const parsed = cboeQuoteSchema.safeParse(body);
  if (!parsed.success) return { status: "missing", reason: `Cboe quote for ${symbol} has an unexpected shape` };

  const { data } = parsed.data;
  const price = firstPositive(data.current_price, data.close, data.prev_day_close);
  if (price === null) return { status: "missing", reason: `Cboe quote for ${symbol} carries no price` };

  const tradeDate = data.last_trade_time?.slice(0, 10) ?? null;
  if (tradeDate && Date.parse(tradeDate) < now.getTime() - STALE_TRADE_DAYS * 86_400_000) {
    return { status: "missing", reason: `Cboe's last trade for ${symbol} was ${tradeDate}` };
  }

  return { status: "ok", value: price };
}
