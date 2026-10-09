import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import type { Metadata } from "next";
import { buildDecisionAnswerMetadata } from "../app/answers/[slug]/page";
import { metadata as guidesMetadata } from "../app/resources/page";
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
  it("prefers a direct asset path over generated params when both are given", () => {
    const metadata = buildPageMetadata({
      title: "Test route",
      description: "Direct asset path",
      path: "/test-route",
      imageAlt: "Test route",
      imagePath: "/social/test.png",
      imageParams: { template: "signals" },
    });

    assert.equal(readFirstImageUrl(metadata), buildSocialImageUrl("/social/test.png"));
    assert.deepEqual(metadata.twitter?.images, [buildSocialImageUrl("/social/test.png")]);
  });

  /*
   * The invariant that matters, and the one nothing checked.
   *
   * `/signals`, `/operate`, `/operate/[workstream]`, `/resolve` and every
   * `/answers/*` page pointed `og:image` at a file under `public/social/*.svg`.
   * X, Slack, LinkedIn, Facebook, Discord and iMessage all refuse
   * `image/svg+xml` for a preview, so those routes unfurled as a bare link on a
   * product whose stated shape is a Slack screenshot. `staticTemplate.tsx` had
   * already recorded the reason — "Most social unfurlers and Google Discover
   * reject image/svg+xml outright" — and moved the templates to PNG through
   * `ImageResponse`; the call sites kept pointing at the leftover files.
   *
   * The previous version of this test asserted those exact SVG paths, so it
   * pinned the defect in place. It checked that the file existed, which was
   * true, rather than that the format unfurls, which was not.
   */
  it("never points og:image at a format social unfurlers reject", () => {
    const routeMetadata: Array<{ route: string; metadata: Metadata }> = [
      { route: "/signals", metadata: signalsMetadata },
      { route: "/operate", metadata: operationsMetadata },
      // Guides took /resolve's place among the hubs on 2026-10-08.
      { route: "/resources", metadata: guidesMetadata },
    ];

    for (const { route, metadata } of routeMetadata) {
      const url = readFirstImageUrl(metadata) ?? "";
      assert.ok(url, `${route} declares an og:image`);
      assert.ok(!/\.svg(\?|$)/i.test(url), `${route} og:image is not an SVG (got ${url})`);
    }
  });

  /*
   * The answer unfurl is the one that most needs to carry content: the page is a
   * question with a dated call, and a shared static card said neither.
   */
  it("renders the answer question and this week's call into the answer unfurl", () => {
    const payload = {
      currentCall: "Raise from leverage.",
      immediateAction: "Start the process now.",
      noindex: false,
    } as Parameters<typeof buildDecisionAnswerMetadata>[0]["payload"];

    const metadata = buildDecisionAnswerMetadata({
      title: "Should Startups Raise Capital Now?",
      slug: "should-startups-raise-capital-now",
      payload,
      shortAnswer: "Raise while terms are still negotiable.",
    });

    const url = readFirstImageUrl(metadata) ?? "";
    assert.ok(!/\.svg(\?|$)/i.test(url), `answer og:image is not an SVG (got ${url})`);

    /*
     * The `solutions` lens draws a fixed right-hand panel, so every answer card
     * carried the same three lines and neither the question nor the call
     * reached it. The answers template puts both on the card.
     */
    const params = new URL(url).searchParams;
    assert.equal(params.get("template"), "answers");
    assert.equal(params.get("title"), "Should Startups Raise Capital Now?");
    assert.equal(params.get("subtitle"), "Raise while terms are still negotiable.");
    assert.equal(params.get("call"), "Raise from leverage.");
    assert.equal(params.get("action"), "Start the process now.");
  });

  it("falls back to the live call when a page has no short answer of its own", () => {
    const metadata = buildDecisionAnswerMetadata({
      title: "Should Startups Raise Capital Now?",
      slug: "should-startups-raise-capital-now",
      payload: {
        currentCall: "Raise from leverage.",
        immediateAction: "Start the process now.",
        noindex: false,
      } as Parameters<typeof buildDecisionAnswerMetadata>[0]["payload"],
    });

    const params = new URL(readFirstImageUrl(metadata) ?? "").searchParams;
    assert.equal(params.get("subtitle"), "Raise from leverage.");
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

  /*
   * Zero `imagePath` references is now the correct state — every route builds its
   * social image through `/api/og`. So this asserts the scanner still works
   * rather than that it found something, which is what would otherwise make the
   * per-path checks above pass vacuously if the walk ever broke.
   */
  it("scanned the app directory", () => {
    assert.ok(pageFiles.length > 0, "expected to find page sources to scan");
  });

  /*
   * Forward-looking half of the same rule as the og:image assertion above: a new
   * route that reaches for a static asset must not reach for an SVG, whatever
   * the file resolves to on disk.
   */
  it("no route points imagePath at an SVG", () => {
    for (const imagePath of referencedPaths) {
      assert.ok(
        !/\.svg$/i.test(imagePath),
        `${imagePath} is an SVG; social unfurlers reject image/svg+xml — use imageParams and /api/og instead`,
      );
    }
  });
});
