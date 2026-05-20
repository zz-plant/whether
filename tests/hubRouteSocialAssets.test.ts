import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import type { Metadata } from "next";
import { buildDecisionAnswerMetadata } from "../app/answers/[slug]/page";
import { metadata as decideMetadata } from "../app/resolve/page";
import { metadata as operationsMetadata } from "../app/planning/page";
import { metadata as signalsMetadata } from "../app/evidence/page";
import { buildPageMetadata, buildSocialImageUrl } from "../lib/seo";

const readFirstImageUrl = (metadata: Metadata) => {
  const openGraphImage = Array.isArray(metadata.openGraph?.images)
    ? metadata.openGraph?.images[0]
    : metadata.openGraph?.images;

  if (typeof openGraphImage === "string") {
    return openGraphImage;
  }

  if (openGraphImage && "url" in openGraphImage) {
    return String(openGraphImage.url);
  }

  return null;
};

describe("hub route social assets", () => {
  it("uses direct social asset paths when imagePath is provided", () => {
    const metadata = buildPageMetadata({
      title: "Test route",
      description: "Direct asset path",
      path: "/test-route",
      imageAlt: "Test route",
      imagePath: "/social/test.svg",
      imageParams: { template: "signals" },
    });

    assert.equal(readFirstImageUrl(metadata), buildSocialImageUrl("/social/test.svg"));
    assert.deepEqual(metadata.twitter?.images, [buildSocialImageUrl("/social/test.svg")]);
  });

  it("maps the highest-priority hubs to dedicated SVG assets", () => {
    const expectedAssets: Array<{ metadata: Metadata; imagePath: string }> = [
      { metadata: signalsMetadata, imagePath: "/social/evidence.svg" },
      { metadata: operationsMetadata, imagePath: "/social/planning.svg" },
      { metadata: decideMetadata, imagePath: "/social/resolve.svg" },
    ];

    for (const asset of expectedAssets) {
      assert.equal(readFirstImageUrl(asset.metadata), buildSocialImageUrl(asset.imagePath));
    }
  });

  it("keeps answer detail metadata on the shared answers asset", () => {
    const payload = {
      currentCall: "Raise from leverage.",
      immediateAction: "Start the process now.",
      noindex: false,
    } as Parameters<typeof buildDecisionAnswerMetadata>[0]["payload"];

    const metadata = buildDecisionAnswerMetadata({
      title: "Should Startups Raise Capital Now?",
      slug: "should-startups-raise-capital-now",
      payload,
    });

    assert.equal(readFirstImageUrl(metadata), buildSocialImageUrl("/social/answers.svg"));
  });
});
