import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeSharePath } from "../lib/report/homeSharePreview";

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
    assert.equal(firstOpenGraphImageAlt, "Whether weekly operating posture preview");
    assert.equal(twitterImages[0], "https://whether.work/api/og?template=report&month=3&year=2026");
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("keeps live weekly brief pages indexable when no time-machine params are present", async () => {
    const metadata = await buildHomeMetadata(undefined);

    assert.equal(metadata.openGraph?.url, "https://whether.work/");
    assert.equal(metadata.robots, undefined);
  });
});
