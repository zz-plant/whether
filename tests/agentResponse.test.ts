import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { negotiateMarkdown, withAgentDiscoveryLinks } from "../lib/runtime/agentResponse";
import { siteUrl } from "../lib/siteUrl";

/*
 * The two response-level handshakes worker/index.ts applies (lib/runtime/agentResponse.ts):
 * the homepage's markdown negotiation and the discovery Link headers on HTML responses.
 * The worker's own wiring is three lines; what can drift silently lives here.
 */

const htmlResponse = () =>
  new Response("<!doctype html><html><head></head></html>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("markdown negotiation", () => {
  const get = (accept?: string, method = "GET", pathname = "/") =>
    new Request(`https://whether.work${pathname}`, {
      method,
      headers: accept ? { accept } : undefined,
    });

  it("rewrites the homepage to the Markdown brief when the client asks for text/markdown", () => {
    const rewritten = negotiateMarkdown(get("text/markdown"));
    assert.equal(rewritten?.url, "https://whether.work/brief.md");
    assert.equal(rewritten?.method, "GET");
  });

  it("negotiates when markdown is one type among several", () => {
    for (const accept of [
      "text/markdown, text/html;q=0.9",
      "text/html;q=0.1, text/markdown;q=0.9",
      "application/json, text/markdown",
    ]) {
      assert.equal(negotiateMarkdown(get(accept))?.url, "https://whether.work/brief.md", accept);
    }
  });

  it("leaves browsers, curl and prefetchers on the HTML homepage", () => {
    for (const accept of [undefined, "*/*", "text/html", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"]) {
      assert.equal(negotiateMarkdown(get(accept)), null, accept ?? "(no accept header)");
    }
  });

  it("negotiates only the homepage: other paths answer HTML", () => {
    assert.equal(negotiateMarkdown(get("text/markdown", "GET", "/history")), null);
    assert.equal(negotiateMarkdown(get("text/markdown", "GET", "/answers/should-we-freeze-hiring")), null);
  });

  it("leaves writes alone", () => {
    assert.equal(negotiateMarkdown(get("text/markdown", "POST")), null);
  });

  it("carries the method and the rest of the headers through", () => {
    const rewritten = negotiateMarkdown(
      new Request("https://whether.work/", { method: "HEAD", headers: { accept: "text/markdown", "user-agent": "probe" } }),
    );
    assert.equal(rewritten?.method, "HEAD");
    assert.equal(rewritten?.headers.get("user-agent"), "probe");
    assert.equal(rewritten?.headers.get("accept"), "text/markdown");
  });
});

describe("discovery Link headers", () => {
  it("points an HTML response at the manifest, llms.txt and the Markdown brief", () => {
    const link = withAgentDiscoveryLinks(htmlResponse()).headers.get("Link") ?? "";
    assert.ok(link.includes(`<${siteUrl}/.well-known/whether-agent.json>; rel="describedby"`), link);
    assert.ok(link.includes(`<${siteUrl}/llms.txt>; rel="describedby"`), link);
    assert.ok(link.includes(`<${siteUrl}/brief.md>; rel="alternate"; type="text/markdown"`), link);
  });

  it("appends to a Link header the response already carries", () => {
    const response = new Response("<html></html>", {
      headers: { "content-type": "text/html", Link: '</other>; rel="prefetch"' },
    });
    const link = withAgentDiscoveryLinks(response).headers.get("Link") ?? "";
    assert.ok(link.includes('</other>; rel="prefetch"'), "the existing link survives");
    assert.ok(link.includes("/brief.md"), "the discovery links are added");
  });

  it("leaves non-HTML responses untouched", () => {
    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    assert.equal(withAgentDiscoveryLinks(json).headers.get("Link"), null);
    const markdown = new Response("# b", { headers: { "content-type": "text/markdown" } });
    assert.equal(withAgentDiscoveryLinks(markdown).headers.get("Link"), null);
  });

  it("preserves status and body", async () => {
    const response = withAgentDiscoveryLinks(new Response("<html>x</html>", { status: 201, headers: { "content-type": "text/html" } }));
    assert.equal(response.status, 201);
    assert.equal(await response.text(), "<html>x</html>");
  });
});
