import assert from "node:assert/strict";
import { describe, it } from "node:test";
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("keeps legacy content aliases routed to canonical destinations", async () => {
    const redirects = await nextConfig.redirects?.();
    assert.ok(Array.isArray(redirects));

    const findRedirect = (source: string) => redirects.find((entry) => entry.source === source);

    assert.deepEqual(findRedirect("/signals/:path*"), {
      source: "/signals/:path*",
      destination: "/evidence/:path*",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/learn"), {
      source: "/learn",
      destination: "/reference",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/learn/concepts/:slug"), {
      source: "/learn/concepts/:slug",
      destination: "/concepts/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/learn/failure-modes/:slug"), {
      source: "/learn/failure-modes/:slug",
      destination: "/library/failure-modes/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/reference/concepts/:slug"), {
      source: "/reference/concepts/:slug",
      destination: "/concepts/:slug",
      permanent: true,
    });

    assert.deepEqual(findRedirect("/reference/failure-modes/:slug"), {
      source: "/reference/failure-modes/:slug",
      destination: "/library/failure-modes/:slug",
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
