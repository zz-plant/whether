import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRobotsRules, CONTENT_SIGNAL, renderRobotsTxt, robotsSitemapPaths } from "../lib/seo/robotsTxt";
import ApiDocsPage from "../app/api-docs/page";
import { GET as llmsTxt } from "../app/llms.txt/route";
import { GET as llmsFullTxt } from "../app/llms-full.txt/route";
import { agentManifestResponse } from "../lib/agentManifest";
import { siteUrl } from "../lib/siteUrl";

/*
 * robots.txt closes `/api/` and opens named paths. Three documents tell agents and developers
 * which API paths to call: `/llms.txt`, the agent manifest and `/api-docs`. The allow list was
 * checked against llms.txt alone, so the manifest's own endpoints and half of `/api-docs` were
 * advertised and disallowed at once. This holds every one of them to the rules each crawler
 * group is given.
 */
describe("robots.txt against every document that advertises an API path", () => {
  const rule = buildRobotsRules();
  const groups = Array.isArray(rule) ? rule : [rule];
  const prefixes = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);

  /* Robots semantics: the most specific matching rule wins, allow or disallow. */
  const longestMatch = (path: string, candidates: string[]) =>
    candidates.filter((prefix) => path.startsWith(prefix)).reduce((best, prefix) => Math.max(best, prefix.length), 0);
  const isAllowed = (path: string) =>
    groups.every((group) => longestMatch(path, prefixes(group.allow)) > longestMatch(path, prefixes(group.disallow)));

  /* This site's paths, relative or under its origin; another site's `/api/` is its own robots.txt's. */
  const apiPathsIn = (text: string) =>
    new Set(
      [...text.matchAll(/(https?:\/\/[^/\s"]+)?(\/api\/[a-z0-9/_-]+)/gi)].flatMap(([, origin, path]) =>
        path !== undefined && (origin === undefined || origin === siteUrl) ? [path] : [],
      ),
    );

  const assertAllAllowed = (paths: Set<string>, source: string) => {
    for (const path of paths) {
      assert.ok(isAllowed(path), `${path} is advertised in ${source} but disallowed by robots.txt`);
    }
  };

  it("allows every /api path that llms.txt and llms-full.txt advertise", async () => {
    const llms = apiPathsIn(await (await llmsTxt()).text());
    assert.ok(llms.has("/api/mcp"), "llms.txt still advertises /api/mcp");
    assert.ok(llms.has("/api/cli/status"), "llms.txt advertises the CLI's status endpoint");
    assertAllAllowed(llms, "llms.txt");
    assertAllAllowed(apiPathsIn(await (await llmsFullTxt()).text()), "llms-full.txt");
  });

  it("allows every endpoint and every other /api URL the agent manifest names", async () => {
    const manifest = await agentManifestResponse().json();
    const endpoints = Object.values<string>(manifest.endpoints).map((url) => new URL(url).pathname);
    assert.ok(endpoints.includes("/api/weekly") && endpoints.includes("/api/treasury"));
    for (const path of endpoints) {
      assert.ok(isAllowed(path), `the manifest's endpoint ${path} is disallowed by robots.txt`);
    }
    assertAllAllowed(apiPathsIn(JSON.stringify(manifest)), "the agent manifest");
  });

  it("allows every /api path /api-docs documents or links", () => {
    const paths = apiPathsIn(renderToStaticMarkup(ApiDocsPage()));
    for (const expected of ["/api/cli/status", "/api/embed", "/api/image/brief-screenshot", "/api/badge", "/api/decision"]) {
      assert.ok(paths.has(expected), `/api-docs documents ${expected}`);
    }
    assertAllAllowed(paths, "/api-docs");
  });

  it("keeps the monitor, telemetry and every cron or admin route closed", async () => {
    const manifest = await agentManifestResponse().json();
    assert.ok(!("health" in manifest.endpoints), "the manifest does not advertise the monitor's probe");

    for (const path of [
      "/api/health",
      "/api/telemetry/web-vitals",
      "/api/check-regime-change",
      "/api/ingest",
      "/api/email/send-weekly",
      "/api/brief/slack/deliver",
      "/api/decision-events",
      "/api/alert-deliveries",
      "/api/month-end-pulse",
      "/api/push",
      "/api/webhooks/slack/actions",
      "/api/weekly-digest",
    ]) {
      assert.ok(!isAllowed(path), `${path} stays closed`);
    }
  });
});

/*
 * The file is rendered from the same rules (app/robots.txt/route.ts, because the
 * Content-Signal line is not representable in Next's MetadataRoute.Robots), so the
 * text and the rules above are one artifact — these hold the render to the model.
 */
describe("the rendered robots.txt text", () => {
  const text = renderRobotsTxt();
  const rules = buildRobotsRules();

  it("declares the content signals in every user-agent group", () => {
    /* One User-Agent line per crawler named in a group, one signal line per group. */
    const userAgentLines = [...text.matchAll(/^User-Agent: (.+)$/gm)].map((match) => match[1]);
    const expected = rules.flatMap((rule) => (Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent]));
    assert.deepEqual(userAgentLines, expected, "every named crawler gets its User-Agent line");
    assert.equal([...text.matchAll(/^Content-Signal: /gm)].length, rules.length, "one signal line per group");
    assert.ok(text.includes(`Content-Signal: ${CONTENT_SIGNAL}`));
  });

  it("renders every allow and disallow path the rules carry", () => {
    for (const rule of rules) {
      const allows = Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : [];
      const disallows = Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
      for (const path of allows) {
        assert.ok(text.includes(`Allow: ${path}`), `${path} is opened in the rendered file`);
      }
      for (const path of disallows) {
        assert.ok(text.includes(`Disallow: ${path}`), `${path} is closed in the rendered file`);
      }
    }
  });

  it("submits the sitemaps and the host", () => {
    for (const url of robotsSitemapPaths) {
      assert.ok(text.includes(`Sitemap: ${url}`), `${url} is submitted`);
    }
    assert.ok(text.includes(`Host: ${siteUrl}`));
  });

  it("stays plain text served at the root", () => {
    assert.ok(text.startsWith("#"), "the header explains the file before any directive");
    assert.ok(!text.includes("undefined"), "no directive was dropped to a literal undefined");
  });
});

