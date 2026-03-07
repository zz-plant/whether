import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ResourceRoutePage, {
  generateMetadata,
  generateStaticParams,
} from "../app/resources/[slug]/page";
import { findResourceArticleBySlug } from "../lib/resourceArticles";

describe("resource article slug route", () => {
  it("includes article slugs in static params for pre-rendering", () => {
    const params = generateStaticParams();

    assert.ok(
      params.some(
        (entry) => entry.slug === "should-we-freeze-hiring-high-interest-rate-environment",
      ),
    );
  });

  it("builds metadata for known article slugs", async () => {
    const article = findResourceArticleBySlug(
      "should-we-freeze-hiring-high-interest-rate-environment",
    );
    assert.ok(article);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: article.slug }),
    });

    assert.equal(metadata.title, article.title);
    assert.equal(metadata.description, article.description);
  });

  it("renders known article slugs", async () => {
    const element = await ResourceRoutePage({
      params: Promise.resolve({
        slug: "should-we-freeze-hiring-high-interest-rate-environment",
      }),
    });

    assert.ok(element);
  });

  it("throws notFound for unknown slugs", async () => {
    await assert.rejects(
      async () =>
        ResourceRoutePage({
          params: Promise.resolve({ slug: "unknown-resource-slug" }),
        }),
      (error: unknown) => {
        if (!(error instanceof Error)) return false;
        return error.message.includes("404") || error.message.includes("NEXT_NOT_FOUND");
      },
    );
  });
});
