import assert from "node:assert/strict";
import { afterEach, describe, it, mock, spyOn } from "bun:test";
import {
  QuoteSourceUnavailableError,
  fetchQuote,
  fetchSaaSValuations,
  SAAS_BASKET,
} from "../lib/saasMultiples";

const stubFetch = (handler: (url: string) => Response) => {
  spyOn(globalThis, "fetch").mockImplementation(async (input) => handler(input.toString()));
};

const quoteBody = (revenue: number, growth: number) =>
  JSON.stringify({
    quoteSummary: {
      result: [
        {
          price: { regularMarketPrice: 100 },
          defaultKeyStatistics: { sharesOutstanding: 1_000_000 },
          financialData: { totalRevenue: revenue, revenueGrowth: growth, totalDebt: 0, totalCash: 0 },
        },
      ],
    },
  });

afterEach(() => {
  mock.restore();
});

describe("fetchQuote", () => {
  it("separates a refused source from an unknown ticker", async () => {
    // Yahoo answers 429 to unauthenticated callers, which the old client mapped
    // to null -- the same value it used for "this company has no data".
    stubFetch(() => new Response("Edge: Too Many Requests", { status: 429 }));
    const throttled = await fetchQuote("MSFT");
    assert.equal(throttled.status, "unavailable");

    stubFetch(() => new Response("not found", { status: 404 }));
    const unknown = await fetchQuote("NOTATICKER");
    assert.equal(unknown.status, "missing");

    stubFetch(() => new Response(quoteBody(1_000_000, 0.2)));
    const found = await fetchQuote("CRM");
    assert.equal(found.status, "ok");
  });
});

describe("fetchSaaSValuations", () => {
  it("throws rather than reporting an empty basket when every quote is refused", async () => {
    stubFetch(() => new Response("Edge: Too Many Requests", { status: 429 }));

    // /api/comps answered ok:true with companyCount 0 through a total outage,
    // which reads as "these companies have no multiples".
    await assert.rejects(fetchSaaSValuations(), QuoteSourceUnavailableError);
  });

  it("reports what it did get when only some of the basket is refused", async () => {
    stubFetch((url) =>
      url.includes(`/${SAAS_BASKET[0]}?`)
        ? new Response(quoteBody(1_000_000, 0.25))
        : new Response("Edge: Too Many Requests", { status: 429 }),
    );

    const snapshot = await fetchSaaSValuations();

    assert.equal(snapshot.companyCount, 1);
    assert.equal(snapshot.medianEvToRevenue, 100);
    assert.equal(snapshot.medianRevenueGrowth, 25);
  });
});
