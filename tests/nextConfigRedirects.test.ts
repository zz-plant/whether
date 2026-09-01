import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "bun:test";

type RedirectEntry = { source: string; destination: string; permanent: boolean };
type RedirectPair = [source: string, destination: string];
type NextConfigModule = {
  default: {
    redirects?: () => Promise<RedirectEntry[]>;
  };
  canonicalSurfaceRedirectPairs: RedirectPair[];
  solutionRedirectPairs: RedirectPair[];
  iaConsolidationRedirectPairs: RedirectPair[];
};
const require = createRequire(import.meta.url);

/* Return-type annotation rather than a cast: require() is already any, so this
 * names the shape without asserting over a known one. */
const loadNextConfig = (): NextConfigModule => require("../next.config.js");

describe("next.config redirects", () => {
  it("materializes every redirect pair as a permanent redirect", async () => {
    const {
      default: nextConfig,
      canonicalSurfaceRedirectPairs,
      solutionRedirectPairs,
      iaConsolidationRedirectPairs,
    } = loadNextConfig();
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const hasRedirect = (predicate: (entry: RedirectEntry) => boolean) =>
      redirects.some((entry: RedirectEntry) => predicate(entry));
    const expectedPairs = [...solutionRedirectPairs, ...canonicalSurfaceRedirectPairs, ...iaConsolidationRedirectPairs];

    assert.equal(redirects.length, expectedPairs.length);

    for (const [source, destination] of expectedPairs) {
      assert.ok(
        hasRedirect((entry) => entry.source === source && entry.destination === destination && entry.permanent),
        `missing redirect ${source} -> ${destination}`,
      );
    }
  });
});

/*
 * A route rename (/resolve → /answer, /evidence → /signals, /planning →
 * /operate) left the aliases matching only the bare path, so every legacy
 * sub-path 404'd, and left redirects pointing at the dead names. Two of those
 * chains — /solutions/career-paths → /resolve/product — shipped a 308 into a
 * 404 in production.
 */
describe("redirect destinations resolve", () => {
  const allPairs = () => {
    const { canonicalSurfaceRedirectPairs, solutionRedirectPairs, iaConsolidationRedirectPairs } = loadNextConfig();
    return [...solutionRedirectPairs, ...canonicalSurfaceRedirectPairs, ...iaConsolidationRedirectPairs];
  };

  const pathOf = (destination: string) => destination.split(/[#?]/)[0];

  it("never points a redirect at a path that is itself redirected", () => {
    const pairs = allPairs();
    const sources = new Set(pairs.map(([source]) => source));

    for (const [source, destination] of pairs) {
      const target = pathOf(destination);
      if (target === "" || target.includes(":")) continue;
      assert.ok(
        !sources.has(target),
        `${source} -> ${destination} lands on ${target}, which is itself redirected`,
      );
    }
  });

  it("keeps a specific alias rule ahead of the wildcard that would shadow it", () => {
    const pairs = allPairs();

    pairs.forEach(([source], index) => {
      if (!source.endsWith("/:path*")) return;
      const prefix = source.slice(0, -"/:path*".length);

      pairs.slice(index + 1).forEach(([laterSource]) => {
        assert.ok(
          !(laterSource.startsWith(`${prefix}/`) && !laterSource.includes(":")),
          `${laterSource} is unreachable: the wildcard ${source} matches it first`,
        );
      });
    });
  });
});
