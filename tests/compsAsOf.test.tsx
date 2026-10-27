import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock, setSystemTime } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import CompsPage, { generateMetadata } from "../app/comps/page";
import { cboeQuoteResponse, companyFactsFixture, healthyYahoo, stubMarketData } from "./fixtures/marketData";

/*
 * /comps leads with the phrase people search ("SaaS valuation multiples") and
 * the month of the read that produced its numbers. The month has to be the
 * data's: the clock here is set to a month no one would type into a title, and
 * the title, the heading and the date printed beside the figures must all name
 * it. With every source refusing there is no read, so nothing on the page may
 * claim a month or credit a source.
 *
 * Rendered, per docs/agents/lessons/tests-and-copy-rules.md: the page reads the
 * basket through `fetchSaaSValuations` and the guidance through
 * `loadWeeklyBriefSnapshot`, which falls back to the bundled snapshot offline.
 */

/* The basket's upstreams answer as the test says; every other upstream stays unreachable, as the network guard has it. */
const READ_DAY = new Date("2027-01-15T12:00:00.000Z");
const filings = { sec: () => Response.json(companyFactsFixture({ latestQuarterEnd: "2026-12-31" })) };
const prices = { cboe: (symbol: string) => cboeQuoteResponse(symbol, 100, "2027-01-14T15:59:59") };
const offline = { other: () => { throw new Error("offline in tests"); } };

/* Inline tags and React's text separators out, so a sentence reads as it does on screen. */
const visibleText = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

/* The page reads the basket through the KV binding when one is installed; these cases own theirs. */
let installedKv: PropertyDescriptor | undefined;
beforeEach(() => {
  installedKv = Object.getOwnPropertyDescriptor(globalThis, "WHETHER_DURABLE_KV");
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
});

afterEach(() => {
  mock.restore();
  setSystemTime();
  if (installedKv) Object.defineProperty(globalThis, "WHETHER_DURABLE_KV", installedKv);
});

describe("/comps title and as-of date", () => {
  it("dates the title, the heading and the figures by the read, and names the filings and prices it came from", async () => {
    setSystemTime(READ_DAY);
    stubMarketData({ ...filings, ...prices, ...offline });

    const metadata = await generateMetadata();
    assert.equal(metadata.title, "SaaS Valuation Multiples, January 2027");

    const html = renderToStaticMarkup(await CompsPage());
    assert.match(html, /<h1[^>]*>\s*SaaS valuation multiples, January 2027\s*<\/h1>/);
    assert.match(html, /<time dateTime="2027-01-15T12:00:00.000Z">Jan 15, 2027<\/time>/);
    assert.ok(
      visibleText(html).includes("As of Jan 15, 2027, from SEC EDGAR filings and Cboe delayed prices."),
      "the read's date and source sit beside the figures",
    );
  });

  it("names Yahoo Finance when the fallback answered instead", async () => {
    setSystemTime(READ_DAY);
    stubMarketData({ sec: () => new Response("busy", { status: 503 }), ...prices, ...healthyYahoo(), ...offline });

    const html = renderToStaticMarkup(await CompsPage());
    assert.ok(visibleText(html).includes("As of Jan 15, 2027, from Yahoo Finance."));
    assert.ok(!html.includes("SEC EDGAR"), "the source that did not answer is not credited");
  });

  it("claims no month and no source when every source refuses", async () => {
    setSystemTime(READ_DAY);
    stubMarketData({ ...offline });

    const metadata = await generateMetadata();
    assert.equal(metadata.title, "SaaS Valuation Multiples: Public SaaS EV/Revenue");

    const html = renderToStaticMarkup(await CompsPage());
    assert.match(html, /<h1[^>]*>\s*SaaS valuation multiples\s*<\/h1>/);
    assert.ok(!html.includes("<time"), "no read, so no read date");
    assert.ok(!html.includes("January 2027"));
    assert.ok(visibleText(html).includes("None of our market data sources is answering right now"));
  });
});
