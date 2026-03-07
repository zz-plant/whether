import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ResourceRoutePage, { generateMetadata, generateStaticParams } from "../app/resources/[slug]/page";
import { downloadableResourceSlugs, downloadableResources } from "../lib/downloadableResources";

describe("downloadable resource pages", () => {
  it("includes all downloadable resource slugs in static params", () => {
    const params = generateStaticParams();

    for (const slug of downloadableResourceSlugs) {
      assert.ok(params.some((entry) => entry.slug === slug));
    }
  });

  it("renders all configured downloadable resource slugs", async () => {
    for (const slug of downloadableResourceSlugs) {
      const page = await ResourceRoutePage({
        params: Promise.resolve({ slug }),
      });
      const html = renderToStaticMarkup(page);
      const config = downloadableResources[slug];

      assert.match(html, new RegExp(config.metadata.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(html, new RegExp(`href=\"${config.downloadCta.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\"`));
      assert.match(html, new RegExp(`href=\"${config.secondaryCta.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\"`));
      assert.match(html, /Canonical pillar: Capital Discipline/);
      assert.match(html, /Board Framework page/);
    }
  });

  it("builds stable metadata for all configured downloadable resources", async () => {
    for (const slug of downloadableResourceSlugs) {
      const config = downloadableResources[slug];
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug }),
      });

      assert.equal(metadata.title, config.metadata.title);
      assert.equal(metadata.description, config.metadata.description);
      assert.equal(metadata.alternates?.canonical, config.metadata.path);
      assert.equal(metadata.openGraph?.title, config.metadata.title);
      assert.equal(metadata.openGraph?.description, config.metadata.description);
    }
  });
});
