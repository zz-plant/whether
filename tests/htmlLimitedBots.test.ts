import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { z } from "zod";

import { buildRobotsRules } from "../lib/seo/robotsTxt";

/*
 * A requester on this list gets <title>, description, canonical and OG tags in
 * <head>; anyone else gets them streamed into <body> on a page whose metadata
 * awaits a read. Google ignores a canonical outside <head> in the fetched HTML,
 * and the AI crawlers robots.ts names do not run JavaScript to move it.
 */
type NextConfigModule = { htmlLimitedBots: string };
const loadNextConfig = (): NextConfigModule => require("../next.config.js");
const { htmlLimitedBots } = loadNextConfig();
const limited = new RegExp(htmlLimitedBots, "i");

describe("html-limited bots", () => {
  it("covers every crawler robots.txt names", () => {
    const named = [buildRobotsRules()]
      .flat()
      .flatMap((rule): unknown[] => [rule.userAgent].flat())
      .filter((agent): agent is string => typeof agent === "string" && agent !== "*");
    assert.ok(named.length > 5, "robots.txt names its crawlers");
    const missing = named.filter((agent: string) => !limited.test(agent));
    assert.deepEqual(missing, [], "a crawler robots.txt addresses would get its metadata in <body>");
  });

  it("covers Google's crawler and leaves browsers streaming", () => {
    assert.ok(limited.test("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"));
    assert.ok(limited.test("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"));
    assert.ok(!limited.test("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"));
    assert.ok(!limited.test("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"));
  });
});

/*
 * The list above decides per request, but a page in the ISR cache is rendered once and served
 * to every requester: the cache key does not vary by user agent. Until 2026-11-26 a browser's
 * render of an answer, a published week, a signal page or an archive period (metadata streamed
 * to the foot of <body>) was cached and served to Googlebot for an hour to a year. 128 sitemap
 * URLs had no <title>, description or canonical in <head> for any crawler.
 * patches/vinext@1.0.1.patch keeps a cache-candidate render's metadata in <head>; vinext 1.4.6
 * has the same code, so a version bump must carry the patch forward.
 */
describe("a cached page keeps its metadata in <head>", () => {
  const dispatch = readFileSync("node_modules/vinext/dist/server/app-page-dispatch.js", "utf8");
  const versions = z.record(z.string(), z.string()).optional();
  const pkg = z
    .object({ dependencies: versions, devDependencies: versions, patchedDependencies: versions })
    .parse(JSON.parse(readFileSync("package.json", "utf8")));

  it("is patched into the installed vinext", () => {
    assert.match(dispatch, /const placeMetadataInBodyForRender = placeGeneratedMetadataInBody && !isCacheCandidate;/);
    assert.equal(
      (dispatch.match(/serveStreamingMetadata: placeMetadataInBodyForRender/g) ?? []).length,
      2,
      "both page renders read the cache-aware choice",
    );
    assert.doesNotMatch(dispatch, /serveStreamingMetadata: placeGeneratedMetadataInBody\b/);
  });

  it("names the patch for the vinext version installed", () => {
    const version = pkg.devDependencies?.vinext ?? pkg.dependencies?.vinext;
    assert.ok(version, "vinext is a dependency");
    assert.equal(pkg.patchedDependencies?.[`vinext@${version}`], `patches/vinext@${version}.patch`);
  });
});
