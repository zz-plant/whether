import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import robots from "../app/robots";
import { GET as llmsTxt } from "../app/llms.txt/route";

/*
 * robots.txt closes `/api/` and opens named paths. llms.txt is the document
 * that tells agents which API paths to call. The two drifted: llms.txt led with
 * `/api/mcp` while robots.txt disallowed it. This holds them together.
 */
describe("robots.txt against llms.txt", () => {
  const rule = robots().rules;
  const rules = Array.isArray(rule) ? rule : [rule];
  const prefixes = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value : value ? [value] : []);
  const allow = rules.flatMap((entry) => prefixes(entry.allow));
  const disallow = rules.flatMap((entry) => prefixes(entry.disallow));

  /* Robots semantics: the most specific matching rule wins, allow or disallow. */
  const longestMatch = (path: string, candidates: string[]) =>
    candidates.filter((prefix) => path.startsWith(prefix)).reduce((best, prefix) => Math.max(best, prefix.length), 0);
  const isAllowed = (path: string) => longestMatch(path, allow) > longestMatch(path, disallow);

  it("allows every /api path that llms.txt advertises", async () => {
    const body = await (await llmsTxt()).text();
    const advertised = new Set(
      [...body.matchAll(/(?:https?:\/\/[^/\s]+)?(\/api\/[a-z0-9/_-]+)/gi)].map((match) => match[1]),
    );

    assert.ok(advertised.has("/api/mcp"), "llms.txt still advertises /api/mcp");
    for (const path of advertised) {
      assert.ok(isAllowed(path), `${path} is advertised in llms.txt but disallowed by robots.txt`);
    }
  });

  it("keeps the rest of /api closed", () => {
    assert.ok(!isAllowed("/api/telemetry/web-vitals"));
    assert.ok(!isAllowed("/api/health"));
  });
});
