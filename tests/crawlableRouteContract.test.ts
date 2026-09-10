import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

/*
 * Two properties a crawler depends on, both of which regressed silently before
 * because nothing asserted them: a page's substance has to be in the server-
 * rendered document, and a page has to name itself as its own canonical.
 *
 * Source assertions rather than rendered ones, deliberately. `"use client"` and
 * `alternates.canonical` are module-level facts — a render test would need a dev
 * server per route and would still be checking the same two declarations.
 */

const ROUTES_WITH_SELF_CANONICAL = [
  ["app/comps/page.tsx", "/comps"],
  ["app/history/page.tsx", "/history"],
  ["app/share/page.tsx", "/share"],
  ["app/api-docs/page.tsx", "/api-docs"],
] as const;

/**
 * Source minus its comments.
 *
 * Every assertion below is about what a file *does*, and each of these files now
 * carries a comment explaining the defect it used to have — quoting the very
 * strings being searched for. Without this the first version of this suite failed
 * on its own documentation, which is the failure mode that teaches people to
 * loosen the assertion rather than keep it.
 */
const codeOf = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "") // JSX comment blocks
    .replace(/\/\*[\s\S]*?\*\//g, "") //           block comments
    .replace(/^\s*\/\/.*$/gm, ""); //              whole-line comments

/** Next honours the directive only as the first statement, so that is where to look. */
const declaresUseClient = (path: string) => {
  const firstStatement = codeOf(path).split("\n").map((line) => line.trim()).find(Boolean);
  return firstStatement === '"use client";' || firstStatement === "'use client';";
};

describe("crawlable route contract", () => {
  /*
   * The root layout used to set `alternates: { canonical: "/" }`, and Next merges
   * metadata down the segment tree, so every page that did not override it named
   * the homepage as its canonical. These four were in the sitemap while doing so
   * — submitted for indexing by one file and disowned by another.
   */
  it("gives every sitemap-listed page its own canonical rather than inheriting one", () => {
    for (const [path, route] of ROUTES_WITH_SELF_CANONICAL) {
      const source = codeOf(path);
      assert.ok(
        source.includes(`canonical: "${route}"`) || source.includes(`path: "${route}"`),
        `${path} declares its own canonical (${route}) instead of inheriting the layout's`,
      );
    }
  });

  it("keeps the root layout from handing every page a canonical or an x-default", () => {
    const layoutSource = codeOf("app/layout.tsx");
    assert.ok(
      !/alternates:\s*\{\s*canonical/.test(layoutSource),
      "the root layout does not set a canonical that every page inherits",
    );
    assert.ok(
      !layoutSource.includes('hrefLang="x-default"'),
      "the root layout does not point every page's x-default at the homepage",
    );
  });

  /*
   * `/comps` was the app's only page-level client component, fetching `/api/comps`
   * from a `useEffect`. Every number the page exists to show — the medians, the
   * company count — was therefore absent from the server-rendered document, while
   * the page sat in the sitemap at the highest priority of any non-hub route.
   * Reading `fetchSaaSValuations` directly also drops a self-fetch of the origin
   * the page is served from, which is the rule the cron path already follows.
   */
  it("renders the SaaS comps basket on the server", () => {
    const source = codeOf("app/comps/page.tsx");

    assert.ok(!declaresUseClient("app/comps/page.tsx"), "/comps is a server component");
    assert.ok(!source.includes('fetch("/api/comps")'), "/comps does not fetch the origin it is served from");
    assert.ok(source.includes("fetchSaaSValuations"), "/comps reads the basket through the library directly");
    assert.ok(
      source.includes("QuoteSourceUnavailableError"),
      "/comps still distinguishes an upstream outage from a basket of zeroes",
    );
  });

  /*
   * The layout's title template appends " | Whether". A page that also carries the
   * brand renders it twice ("Terms of Service — Whether | Whether").
   */
  it("does not carry the brand in page titles that the title template already suffixes", () => {
    for (const path of [
      "app/share/page.tsx",
      "app/terms-of-service/page.tsx",
      "app/acceptable-use-policy/page.tsx",
      "app/comps/page.tsx",
      "app/history/page.tsx",
    ]) {
      const source = codeOf(path);
      assert.ok(
        !/title: "[^"]*(?:\||—) Whether"/.test(source),
        `${path} leaves the brand suffix to the layout's title template`,
      );
    }
  });
});
