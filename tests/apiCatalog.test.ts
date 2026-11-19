import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { GET as getOpenApi } from "../app/openapi.json/route";
import { API_CATALOG_CONTENT_TYPE, apiCatalogResponse } from "../lib/agent/apiCatalog";
import { AGENT_VIEWS, API_CATALOG_PATH } from "../lib/agent/discovery";
import { agentManifestResponse } from "../lib/agentManifest";
import { buildRobotsRules } from "../lib/seo/robotsTxt";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

/*
 * The API catalog (RFC 9727) and the OpenAPI document it names. A catalog entry is a promise
 * that the linked description exists and that what it describes is served; both are checked
 * against the routes, and every path the OpenAPI document lists against robots.txt, the same
 * rule the manifest and /llms.txt are held to (tests/robotsRoute.test.ts).
 */

const catalogUrl = `https://whether.work${API_CATALOG_PATH}`;
const readCatalog = () => apiCatalogResponse(new Request(catalogUrl)).json();
const readOpenApi = async () => (await getOpenApi()).json();

const robotsGroups = (() => {
  const rule = buildRobotsRules();
  return Array.isArray(rule) ? rule : [rule];
})();
const list = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);
const longestMatch = (path: string, prefixes: string[]) =>
  prefixes.filter((prefix) => path.startsWith(prefix)).reduce((best, prefix) => Math.max(best, prefix.length), 0);
const robotsAllows = (path: string) =>
  robotsGroups.every((group) => longestMatch(path, list(group.allow)) > longestMatch(path, list(group.disallow)));

describe("/.well-known/api-catalog", () => {
  it("answers GET with a linkset in the RFC 9727 media type", async () => {
    const response = apiCatalogResponse(new Request(catalogUrl));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), API_CATALOG_CONTENT_TYPE);
    assert.ok(response.headers.get("content-type")?.startsWith("application/linkset+json"));
    assert.equal(response.headers.get("link"), `<${catalogUrl}>; rel="api-catalog"`);

    const catalog = await response.json();
    assert.ok(Array.isArray(catalog.linkset) && catalog.linkset.length > 0);
    for (const entry of catalog.linkset) {
      assert.match(entry.anchor, /^https:\/\/whether\.work\//, "every anchor is absolute and on this origin");
      assert.ok(entry["service-desc"]?.length > 0, `${entry.anchor} has a service-desc`);
      assert.ok(entry["service-doc"]?.length > 0, `${entry.anchor} has a service-doc`);
      for (const link of [...entry["service-desc"], ...entry["service-doc"]]) {
        assert.match(link.href, /^https:\/\/whether\.work\//);
        assert.equal(typeof link.type, "string");
      }
    }
  });

  it("answers HEAD with the same headers and no body, and refuses other methods", async () => {
    const head = apiCatalogResponse(new Request(catalogUrl, { method: "HEAD" }));
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-type"), API_CATALOG_CONTENT_TYPE);
    assert.equal(await head.text(), "");

    const post = apiCatalogResponse(new Request(catalogUrl, { method: "POST" }));
    assert.equal(post.status, 405);
    assert.equal(post.headers.get("allow"), "GET, HEAD");
  });

  it("links only descriptions and docs the site serves", async () => {
    const catalog = await readCatalog();
    const manifest = await agentManifestResponse().json();
    const hrefs: string[] = catalog.linkset.flatMap((entry: Record<string, unknown>) =>
      Object.entries(entry).flatMap(([rel, links]) => {
        if (rel === "anchor") return [];
        assert.ok(Array.isArray(links), `${rel} is a list of links`);
        return links.map((link: { href?: unknown }) => {
          assert.equal(typeof link.href, "string", `${rel} has an href`);
          return String(link.href);
        });
      }),
    );
    for (const href of hrefs) {
      const { pathname } = new URL(href);
      if (pathname === "/.well-known/whether-agent.json") {
        assert.equal(manifest.baseUrl, "https://whether.work");
        continue;
      }
      const served = pathname === "/api-docs" ? await import("../app/api-docs/page") : await import(`../app${pathname}/route`);
      assert.ok(typeof (served.GET ?? served.default) === "function", `${href} is served`);
      assert.ok(robotsAllows(pathname), `${pathname} is linked from the catalog and closed by robots.txt`);
    }
    assert.ok(robotsAllows(API_CATALOG_PATH), "robots.txt allows the catalog");
    assert.ok(hrefs.includes(manifest.endpoints.openapi), "the HTTP API's service-desc is the manifest's OpenAPI endpoint");
  });

  it("is routed by the Worker, since app/.well-known is never registered", () => {
    const worker = readFileSync("worker/index.ts", "utf8");
    assert.match(worker, /url\.pathname === API_CATALOG_PATH\)\s*\{\s*return apiCatalogResponse\(request\);/);
  });
});

describe("/openapi.json", () => {
  it("is an OpenAPI 3.1 document for this origin", async () => {
    const response = await getOpenApi();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^application\/vnd\.oai\.openapi\+json/);
    const doc = await readOpenApi();
    assert.equal(doc.openapi, "3.1.0");
    assert.deepEqual(doc.servers, [{ url: "https://whether.work" }]);
    assert.equal(doc.components.schemas.AgentState.type, "object");
  });

  it("lists only paths the app serves with the listed methods, each open to crawlers", async () => {
    const doc = await readOpenApi();
    for (const [path, operations] of Object.entries<Record<string, unknown>>(doc.paths)) {
      const route = await import(`../app${path}/route`);
      for (const method of Object.keys(operations)) {
        assert.equal(typeof route[method.toUpperCase()], "function", `${method.toUpperCase()} ${path} is served`);
      }
      assert.ok(robotsAllows(path), `${path} is in the OpenAPI document and closed by robots.txt`);
    }
  });

  it("lists the views the agent route accepts, and no others", async () => {
    const doc = await readOpenApi();
    const view = doc.paths["/api/agent"].get.parameters.find((param: { name: string }) => param.name === "view");
    const refused = await (await getAgent(new Request("https://whether.work/api/agent?view=nope"))).json();
    assert.deepEqual(view.schema.enum, refused.allowedViews);
    assert.deepEqual(view.schema.enum, [...AGENT_VIEWS]);
  });
});
