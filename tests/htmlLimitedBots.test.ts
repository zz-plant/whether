import assert from "node:assert/strict";
import { describe, it } from "bun:test";

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
