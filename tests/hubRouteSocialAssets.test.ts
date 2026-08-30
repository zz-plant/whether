import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import type { Metadata } from "next";
import { buildDecisionAnswerMetadata } from "../app/answers/[slug]/page";
import { metadata as decideMetadata } from "../app/answer/page";
import { metadata as operationsMetadata } from "../app/operate/page";
import { metadata as signalsMetadata } from "../app/signals/page";
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

/**
 * Every imagePath that a page points at must resolve to a real file under public/.
 * This is what historically let a missing history.svg ship as a 404 og:image
 * while every referenced hub asset still resolved. The test scans the page
 * sources rather than hand-listing routes, so a new imagePath cannot drift.
 */
describe("referenced social assets resolve to files on disk", () => {
  const referencedPaths = new Set<string>();
  const collectImagePaths = (dir: string, files: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = `${dir}/${entry.name}`;
      if (entry.isDirectory()) collectImagePaths(abs, files);
      else if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(abs);
    }
  };

  const pageFiles: string[] = [];
  collectImagePaths("app", pageFiles);

  for (const file of pageFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/imagePath:\s*["'`]([^"'`]+)["'`]/g)) {
      referencedPaths.add(match[1]);
    }
  }

  for (const imagePath of [...referencedPaths].sort()) {
    it(`${imagePath} exists under public/`, () => {
      assert.ok(
        existsSync(`public${imagePath}`),
        `${imagePath} is referenced in page metadata but missing from public/`,
      );
    });
  }

  it("discovered at least one social asset reference", () => {
    assert.ok(referencedPaths.size > 0, "expected to find imagePath references");
  });
});
