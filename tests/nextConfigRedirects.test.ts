import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("keeps legacy content aliases routed to canonical destinations", async () => {
    const redirects = await nextConfig.redirects?.();
    assert.ok(Array.isArray(redirects));

    const findRedirect = (source: string) => redirects.find((entry) => entry.source === source);


    assert.deepEqual(findRedirect("/operate"), {
      source: "/operate",
      destination: "/operations",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/templates"), {
      source: "/templates",
      destination: "/toolkits",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/toolkit"), {
      source: "/toolkit",
      destination: "/toolkits",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/evidence/:path*"), {
      source: "/evidence/:path*",
      destination: "/signals/:path*",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/reference/:path*"), {
      source: "/reference/:path*",
      destination: "/method/:path*",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/reference/concepts/:slug"), {
      source: "/reference/concepts/:slug",
      destination: "/concepts/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/reference/failure-modes/:slug"), {
      source: "/reference/failure-modes/:slug",
      destination: "/learn/failure-modes/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/learn/concepts/:slug"), {
      source: "/learn/concepts/:slug",
      destination: "/concepts/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/library/failure-modes/:slug"), {
      source: "/library/failure-modes/:slug",
      destination: "/learn/failure-modes/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/library"), {
      source: "/library",
      destination: "/learn",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/library/canon/:slug"), {
      source: "/library/canon/:slug",
      destination: "/concepts/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/use-cases/:slug"), {
      source: "/use-cases/:slug",
      destination: "/decide/:slug",
      permanent: true,
    });
  });
});
