import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

type RedirectEntry = { source: string; destination: string; permanent: boolean };
type RedirectPair = [source: string, destination: string];
type NextConfigModule = {
  default: {
    redirects?: () => Promise<RedirectEntry[]>;
  };
  canonicalSurfaceRedirectPairs: RedirectPair[];
  solutionRedirectPairs: RedirectPair[];
};
const require = createRequire(import.meta.url);

describe("next.config redirects", () => {
  it("materializes every redirect pair as a permanent redirect", async () => {
    const {
      default: nextConfig,
      canonicalSurfaceRedirectPairs,
      solutionRedirectPairs,
    } = require("../next.config.js") as NextConfigModule;
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const hasRedirect = (predicate: (entry: RedirectEntry) => boolean) =>
      redirects.some((entry: RedirectEntry) => predicate(entry));
    const expectedPairs = [...solutionRedirectPairs, ...canonicalSurfaceRedirectPairs];

    assert.equal(redirects.length, expectedPairs.length);

    for (const [source, destination] of expectedPairs) {
      assert.ok(
        hasRedirect((entry) => entry.source === source && entry.destination === destination && entry.permanent),
        `missing redirect ${source} -> ${destination}`,
      );
    }
  });
});
