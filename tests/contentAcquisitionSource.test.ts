import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { classifyAcquisitionSource, isContentMeasurementEvent, resolveEntranceSource } from "../lib/contentMeasurement";

/*
 * The entrance event was named `organic_entrance` and checked no referrer at
 * all, so direct, paid, and inbound-from-social visits were counted as organic.
 * That inflated the traffic tier the refresh queue derives and the conversion
 * target every page was judged against.
 */
describe("acquisition classification", () => {
  const host = "whether.work";

  it("reads a search engine as search, including a country domain", () => {
    assert.equal(classifyAcquisitionSource("https://www.google.com/", host), "search");
    assert.equal(classifyAcquisitionSource("https://www.google.co.uk/search?q=x", host), "search");
    assert.equal(classifyAcquisitionSource("https://duckduckgo.com/", host), "search");
  });

  it("separates social from a plain referral", () => {
    assert.equal(classifyAcquisitionSource("https://news.ycombinator.com/item?id=1", host), "social");
    assert.equal(classifyAcquisitionSource("https://t.co/abc", host), "social");
    assert.equal(classifyAcquisitionSource("https://someblog.example/post", host), "referral");
  });

  it("reads no referrer, and an unparseable one, as direct", () => {
    assert.equal(classifyAcquisitionSource("", host), "direct");
    assert.equal(classifyAcquisitionSource("   ", host), "direct");
    assert.equal(classifyAcquisitionSource("not a url", host), "direct");
  });

  it("does not count a click inside the site as an entrance from outside it", () => {
    assert.equal(classifyAcquisitionSource("https://whether.work/signals", host), "internal");
    assert.equal(classifyAcquisitionSource("https://WHETHER.WORK/signals", "Whether.Work"), "internal");
  });

  /*
   * Only the bucket is sent. The referring URL, its path, and any campaign
   * parameters stay in the browser — this product tells readers it runs no
   * trackers, and the refresh loop needs nothing finer than "from a search
   * engine".
   */
  it("classifies into five buckets and nothing finer", () => {
    const buckets = new Set([
      classifyAcquisitionSource("https://www.google.com/", host),
      classifyAcquisitionSource("https://t.co/abc", host),
      classifyAcquisitionSource("https://someblog.example/", host),
      classifyAcquisitionSource("", host),
      classifyAcquisitionSource("https://whether.work/x", host),
    ]);

    assert.deepEqual([...buckets].sort(), ["direct", "internal", "referral", "search", "social"]);
  });
});

/*
 * `document.referrer` belongs to the document, not the route. The session flag
 * alone was not enough, because it is set when a tracker first mounts and most
 * routes carry none: a reader arriving from Google at `/` and clicking through
 * to an answer page hit the first tracker on a page they reached internally,
 * with the referrer still naming Google. That is the very number the
 * classification exists to make trustworthy.
 */
describe("which entrance counts as a landing", () => {
  const host = "whether.work";

  it("uses the referrer for the page the document was actually loaded with", () => {
    assert.equal(
      resolveEntranceSource({
        alreadyRecorded: false,
        documentUrl: "https://whether.work/answers/should-startups-hire-engineers-right-now",
        currentPathname: "/answers/should-startups-hire-engineers-right-now",
        referrer: "https://www.google.com/",
        currentHost: host,
      }),
      "search",
    );
  });

  it("reads a soft navigation away from the landing page as internal", () => {
    assert.equal(
      resolveEntranceSource({
        alreadyRecorded: false,
        documentUrl: "https://whether.work/",
        currentPathname: "/answers/should-startups-hire-engineers-right-now",
        referrer: "https://www.google.com/",
        currentHost: host,
      }),
      "internal",
    );
  });

  it("still reads a landing whose query string the app rewrote as a landing", () => {
    assert.equal(
      resolveEntranceSource({
        alreadyRecorded: false,
        documentUrl: "https://whether.work/resources/capital-discipline?utm_source=newsletter",
        currentPathname: "/resources/capital-discipline",
        referrer: "https://news.ycombinator.com/item?id=1",
        currentHost: host,
      }),
      "social",
    );
  });

  it("counts every later entrance in the tab as internal", () => {
    assert.equal(
      resolveEntranceSource({
        alreadyRecorded: true,
        documentUrl: "https://whether.work/answers/x",
        currentPathname: "/answers/x",
        referrer: "https://www.google.com/",
        currentHost: host,
      }),
      "internal",
    );
  });

  it("falls back to the referrer when navigation timing says nothing usable", () => {
    for (const documentUrl of [undefined, "not a url"]) {
      assert.equal(
        resolveEntranceSource({
          alreadyRecorded: false,
          documentUrl,
          currentPathname: "/trust",
          referrer: "https://duckduckgo.com/",
          currentHost: host,
        }),
        "search",
      );
    }
  });
});

describe("content measurement event validation", () => {
  const base = { pagePath: "/trust", cluster: "authority", intent: "board", type: "organic_entrance" };

  it("accepts an event with a known source, and one with none", () => {
    assert.ok(isContentMeasurementEvent({ ...base, source: "search" }));
    assert.ok(isContentMeasurementEvent(base), "rows written before classification stay valid");
  });

  it("rejects a source outside the model rather than storing it", () => {
    assert.ok(!isContentMeasurementEvent({ ...base, source: "carrier-pigeon" }));
  });
});
