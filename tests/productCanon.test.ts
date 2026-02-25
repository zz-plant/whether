import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findProductConceptArticle,
  getMacroContextForArticle,
  productConceptArticles,
} from "../lib/productCanon";

describe("productCanon", () => {
  it("contains unique slugs", () => {
    const slugs = productConceptArticles.map((article) => article.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("returns macro context for entries in the monthly snapshot range", () => {
    const article = findProductConceptArticle("how-to-hire-a-product-manager");
    assert.ok(article);

    const context = getMacroContextForArticle(article);
    assert.ok(context);
    assert.equal(context?.primary.year, article.publishedYear);
    assert.equal(context?.primary.month, article.publishedMonth);
    assert.ok((context?.surrounding.length ?? 0) >= 4);
  });

  it("maps institutional-friction entries to macro context", () => {
    const article = findProductConceptArticle("product-strategy-vs-product-plan");
    assert.ok(article);

    const context = getMacroContextForArticle(article);
    assert.ok(context);
    assert.equal(context?.primary.year, 2021);
  });


  it("uses normalized outbound source links", () => {
    const deprecatedUrls = new Set([
      "https://melissaperri.com/book/escaping-the-build-trap/",
      "https://www.pendo.io/perspectives/the-product-momentum-gap/",
      "https://www.intercom.com/blog/product-management-career-framework/",
      "https://www.svpg.com/product-strategy-vs-product-plan/",
    ]);

    for (const article of productConceptArticles) {
      assert.ok(article.sourceUrl.startsWith("https://"));
      assert.ok(!deprecatedUrls.has(article.sourceUrl));
    }
  });

  it("returns null when historical month is outside snapshot range", () => {
    const article = findProductConceptArticle("what-exactly-is-a-product-manager");
    assert.ok(article);

    const context = getMacroContextForArticle(article);
    assert.equal(context, null);
  });
});
