import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeSharePath, notLiveReadingLabel, readerSourceLabel } from "../lib/report/homeSharePreview";

describe("buildHomeSharePath", () => {
  it("preserves defined home report search params in a stable query string", () => {
    assert.equal(
      buildHomeSharePath({ year: "2026", month: "3", view: "forecast", sector: "consumer" }),
      "/?month=3&sector=consumer&view=forecast&year=2026",
    );
  });

  it("returns the canonical home path when no params are provided", () => {
    assert.equal(buildHomeSharePath(), "/");
  });
});

/* Both share cards (`/api/og`, `/api/image/brief`) print these two answers. */
describe("card labels", () => {
  it("credits every input the scores are built from, not just the rates", () => {
    // The scores start from Treasury rates; credit spreads, volatility and financial
    // conditions (FRED) and the curated startup-market snapshot then adjust them. The
    // label said "US Treasury rates" alone, which reads as rates-only.
    const label = readerSourceLabel("Canonical ingestion (FRED)");

    assert.match(label, /Treasury/);
    assert.match(label, /\(FRED\)/);
    assert.match(label, /curated startup-market snapshot/);
    assert.equal(readerSourceLabel("Federal Reserve Economic Data (FRED)"), label);
  });

  it("names the Treasury feed alone when that is all there is, and passes any other source through", () => {
    assert.equal(readerSourceLabel("US Treasury yield curve"), "US Treasury daily yield curve");
    assert.equal(readerSourceLabel("A vendor feed"), "A vendor feed");
  });

  it("says why a card is not this week's live reading, in the order that matters", () => {
    const banner = "Historical mode active · March 2026";

    assert.equal(notLiveReadingLabel({ historicalBanner: banner, monthRequested: true, isFallback: true }), banner);
    assert.equal(
      notLiveReadingLabel({ historicalBanner: null, monthRequested: true, isFallback: true }),
      "That month is not on record",
    );
    assert.equal(
      notLiveReadingLabel({ historicalBanner: null, monthRequested: false, isFallback: true }),
      "Saved reading, not live",
    );
    assert.equal(notLiveReadingLabel({ historicalBanner: null, monthRequested: false, isFallback: false }), null);
  });
});

describe("buildHomeMetadata", () => {
  it("builds stable metadata without waiting on weekly snapshot data", async () => {
    const metadata = await buildHomeMetadata(
      Promise.resolve({ month: "3", year: "2026", view: "forecast" }),
    );
    const openGraphImages = Array.isArray(metadata.openGraph?.images)
      ? metadata.openGraph.images
      : metadata.openGraph?.images
        ? [metadata.openGraph.images]
        : [];
    const firstOpenGraphImage = openGraphImages[0];
    const twitterImages = Array.isArray(metadata.twitter?.images)
      ? metadata.twitter.images
      : metadata.twitter?.images
        ? [metadata.twitter.images]
        : [];

    assert.equal(metadata.alternates?.canonical, "/");
    assert.equal(metadata.openGraph?.url, "https://whether.work/?month=3&view=forecast&year=2026");
    const firstOpenGraphImageUrl = typeof firstOpenGraphImage === "string"
      ? firstOpenGraphImage
      : firstOpenGraphImage instanceof URL
        ? firstOpenGraphImage.toString()
        : firstOpenGraphImage?.url;
    const firstOpenGraphImageAlt = firstOpenGraphImage && typeof firstOpenGraphImage === "object" && !(firstOpenGraphImage instanceof URL) && "alt" in firstOpenGraphImage
      ? firstOpenGraphImage.alt
      : undefined;
    assert.equal(firstOpenGraphImageUrl, "https://whether.work/api/og?template=report&month=3&year=2026");
    assert.equal(firstOpenGraphImageAlt, "Whether: this week's guidance");
    assert.equal(twitterImages[0], "https://whether.work/api/og?template=report&month=3&year=2026");
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("keeps live weekly brief pages indexable when no time-machine params are present", async () => {
    const metadata = await buildHomeMetadata(undefined);

    assert.equal(metadata.openGraph?.url, "https://whether.work/");
    assert.equal(metadata.robots, undefined);
  });
});

/*
 * A link preview has 210 characters and the card's change box 140. The sentence that says which lines a
 * week crossed ran past both and was cut in the middle of them ("...funding pressure rose through 76
 * and risk…"), so those two surfaces carry the consequence without the evidence.
 */
describe("what the share preview says changed", () => {
  it("carries the consequence whole, not the sentence cut through its evidence", async () => {
    const { loadHomeSharePreview } = await import("../lib/report/homeSharePreview");
    const preview = await loadHomeSharePreview();

    assert.ok(preview.changeSummary.length <= 140);
    assert.doesNotMatch(preview.changeSummary, /…$|\.\.\.$/, "the change box is a whole sentence");
    assert.doesNotMatch(preview.changeSummary, /(?:rose|fell) through \d+(?: and| risk| funding)?$/, "and not cut mid-line-list");
    assert.doesNotMatch(preview.changeSummary, /Pressure increased|Slow new commitments/);
  });
});
