import assert from "node:assert/strict";
import { afterEach, describe, it, mock, setSystemTime, spyOn } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import CompsPage, { generateMetadata } from "../app/comps/page";

/*
 * /comps leads with the phrase people search ("SaaS valuation multiples") and
 * the month of the read that produced its numbers. The month has to be the
 * data's: the clock here is set to a month no one would type into a title, and
 * the title, the heading and the date printed beside the figures must all name
 * it. With the quote source refusing every ticker there is no read, so nothing
 * on the page may claim a month.
 *
 * Rendered, per docs/agents/lessons/tests-and-copy-rules.md: the page reads the
 * basket through `fetchSaaSValuations` and the guidance through
 * `loadWeeklyBriefSnapshot`, which falls back to the bundled snapshot offline.
 */

const quoteBody = JSON.stringify({
  quoteSummary: {
    result: [
      {
        price: { regularMarketPrice: 100 },
        defaultKeyStatistics: { sharesOutstanding: 1_000_000 },
        financialData: { totalRevenue: 10_000_000, revenueGrowth: 0.2, totalDebt: 0, totalCash: 0 },
      },
    ],
  },
});

/* The quote source answers as the test says; every other upstream stays unreachable, as the network guard has it. */
const stubQuoteSource = (answer: () => Response) => {
  spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (input.toString().includes("finance.yahoo.com")) return answer();
    throw new Error("offline in tests");
  });
};

/* Inline tags and React's text separators out, so a sentence reads as it does on screen. */
const visibleText = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

afterEach(() => {
  mock.restore();
  setSystemTime();
});

describe("/comps title and as-of date", () => {
  it("dates the title, the heading and the figures by the read", async () => {
    setSystemTime(new Date("2027-01-15T12:00:00.000Z"));
    stubQuoteSource(() => new Response(quoteBody));

    const metadata = await generateMetadata();
    assert.equal(metadata.title, "SaaS Valuation Multiples, January 2027");

    const html = renderToStaticMarkup(await CompsPage());
    assert.match(html, /<h1[^>]*>\s*SaaS valuation multiples, January 2027\s*<\/h1>/);
    assert.match(html, /<time dateTime="2027-01-15T12:00:00.000Z">Jan 15, 2027<\/time>/);
    assert.ok(visibleText(html).includes("As of Jan 15, 2027, from Yahoo Finance."), "the read's date and source sit beside the figures");
  });

  it("claims no month when the quote source refuses every ticker", async () => {
    setSystemTime(new Date("2027-01-15T12:00:00.000Z"));
    stubQuoteSource(() => new Response("Edge: Too Many Requests", { status: 429 }));

    const metadata = await generateMetadata();
    assert.equal(metadata.title, "SaaS Valuation Multiples: Public SaaS EV/Revenue");

    const html = renderToStaticMarkup(await CompsPage());
    assert.match(html, /<h1[^>]*>\s*SaaS valuation multiples\s*<\/h1>/);
    assert.ok(!html.includes("<time"), "no read, so no read date");
    assert.ok(!html.includes("January 2027"));
  });
});
