import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig, {
  canonicalSurfaceRedirectPairs,
  solutionRedirectPairs,
} from "../next.config.js";

type RedirectEntry = { source: string; destination: string; permanent: boolean };

describe("next.config redirects", () => {
  it("materializes every redirect pair as a permanent redirect", async () => {
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
