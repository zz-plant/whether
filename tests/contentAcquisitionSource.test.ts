import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { classifyAcquisitionSource, isContentMeasurementEvent } from "../lib/contentMeasurement";

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
