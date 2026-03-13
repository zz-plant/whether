import assert from "node:assert/strict";
import { describe, it } from "node:test";
import LegacySlugRoute, { generateStaticParams } from "../app/[legacySlug]/page";
import {
  legacyRedirects,
  resolveLegacyRedirectPath,
  resolveLegacyRedirectSlug,
} from "../lib/navigation/legacyRedirects";

describe("legacy answer redirect routes", () => {
  it("keeps a single redirect registry with explicit legacy path to answer path pairs", () => {
    assert.equal(legacyRedirects.length, 12);

    for (const { legacyPath, targetPath } of legacyRedirects) {
      assert.equal(resolveLegacyRedirectPath(legacyPath), targetPath);
      assert.equal(resolveLegacyRedirectSlug(legacyPath.slice(1)), targetPath);
    }
  });

  it("pre-renders all legacy slugs in the dynamic redirect route", () => {
    const staticParams = generateStaticParams();

    assert.deepEqual(
      staticParams.map((entry) => entry.legacySlug).sort(),
      legacyRedirects.map(({ legacyPath }) => legacyPath.slice(1)).sort(),
    );
  });

  it("redirects every legacy URL to the exact existing /answers/:slug target", async () => {
    for (const { legacyPath, targetPath } of legacyRedirects) {
      const legacySlug = legacyPath.slice(1);

      await assert.rejects(
        () => LegacySlugRoute({ params: Promise.resolve({ legacySlug }) }),
        (error: unknown) => {
          if (!(error instanceof Error)) return false;
          const digest = (error as Error & { digest?: string }).digest;
          return (
            typeof digest === "string" &&
            digest.startsWith("NEXT_REDIRECT") &&
            digest.includes(`${targetPath};308;`)
          );
        },
      );
    }
  });
});
