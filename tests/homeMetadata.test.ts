import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHomeMetadata } from "../lib/report/homeMetadata";
import { buildHomeSharePath, type HomeSharePreview } from "../lib/report/homeSharePreview";

const preview: HomeSharePreview = {
  title: "Defensive posture: Pause non-core hiring — Whether",
  description: "For founders in 2026-03. Pause non-core hiring. Stage decisions. Avoid irreversible spend. Changed: signals deteriorated and posture tightened this week. Flip when: risk appetite recovers above threshold.",
  url: "https://whether.work/?month=3&view=forecast&year=2026",
  imageUrl: "https://whether.work/api/og?template=report&month=3&year=2026",
  imageAlt: "Defensive posture weekly Whether report card for Week ending Mar 6, 2026",
  eyebrow: "Whether Weekly Brief",
  audienceLabel: "For founders in 2026-03",
  weekLabel: "Week ending Mar 6, 2026",
  statusLabel: "Defensive posture",
  contextLabel: "Historical mode active · 2026-03",
  headline: "Pause non-core hiring",
  whyItMatters: "Stage decisions. Avoid irreversible spend.",
  operatingStanceLine: "Stage decisions. Avoid irreversible spend.",
  changeSummary: "Signals deteriorated and posture tightened this week.",
  immediateDecision: "Pause non-core hiring.",
  flipCondition: "Risk appetite recovers above threshold.",
  confidenceLabel: "MED",
  trendLabel: "Deteriorating",
  postureDelta: "Worse than last week",
  baseRateLabel: "5.20%",
  curveSlopeLabel: "-0.10%",
  freshnessLine: "Updated Mar 1, 2026 00:00 UTC · live · mixed-reliability",
  sourceLabel: "Federal Reserve Economic Data (FRED)",
  isHistorical: true,
  isFallback: false,
};

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
  it("uses the week-specific share preview for metadata fields", async () => {
    const metadata = await buildHomeMetadata(
      Promise.resolve({ month: "3", year: "2026", view: "forecast" }),
      {
        loadHomeSharePreview: async () => preview,
      },
    );
    const openGraphImages = Array.isArray(metadata.openGraph?.images)
      ? metadata.openGraph.images
      : metadata.openGraph?.images
        ? [metadata.openGraph.images]
        : [];
    const twitterImages = Array.isArray(metadata.twitter?.images)
      ? metadata.twitter.images
      : metadata.twitter?.images
        ? [metadata.twitter.images]
        : [];

    assert.equal(metadata.title, preview.title);
    assert.equal(metadata.description, preview.description);
    assert.equal(metadata.alternates?.canonical, "/");
    assert.equal(metadata.openGraph?.url, preview.url);
    assert.equal(openGraphImages[0]?.url, preview.imageUrl);
    assert.equal(openGraphImages[0]?.alt, preview.imageAlt);
    assert.equal(twitterImages[0], preview.imageUrl);
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("keeps live weekly brief pages indexable when no time-machine params are present", async () => {
    const metadata = await buildHomeMetadata(undefined, {
      loadHomeSharePreview: async () => ({
        ...preview,
        url: "https://whether.work/",
        isHistorical: false,
        contextLabel: "Live (high confidence)",
      }),
    });

    assert.equal(metadata.openGraph?.url, "https://whether.work/");
    assert.equal(metadata.robots, undefined);
  });
});
