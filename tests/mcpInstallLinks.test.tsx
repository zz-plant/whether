import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ApiDocsPage from "../app/api-docs/page";
import { siteUrl } from "../lib/siteUrl";

/*
 * The install links open an editor with the server filled in. A link whose
 * config names a different address than the JSON beside it would connect the
 * reader to something the page never showed them, so both are read back here.
 */

const html = renderToStaticMarkup(ApiDocsPage());
const hrefOf = (label: string) => {
  const match = new RegExp(`<a href="([^"]+)"[^>]*>${label}</a>`).exec(html);
  assert.ok(match?.[1], `no "${label}" link`);
  return match[1].replaceAll("&amp;", "&");
};

describe("MCP install links", () => {
  const mcpUrl = `${siteUrl}/api/mcp`;

  it("opens Cursor with the server's address", () => {
    const href = hrefOf("Add to Cursor");
    assert.ok(href.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?"));
    const params = new URL(href.replace("cursor://", "https://")).searchParams;
    assert.equal(params.get("name"), "whether");
    assert.deepEqual(JSON.parse(atob(params.get("config") ?? "")), { url: mcpUrl });
  });

  it("opens VS Code with the server's address over HTTP", () => {
    const href = hrefOf("Add to VS Code");
    assert.ok(href.startsWith("vscode:mcp/install?"));
    assert.deepEqual(JSON.parse(decodeURIComponent(href.slice("vscode:mcp/install?".length))), {
      name: "whether",
      type: "http",
      url: mcpUrl,
    });
  });

  it("prints the Claude Code command for the same address", () => {
    assert.ok(html.includes(`claude mcp add --transport http whether ${mcpUrl}`));
  });
});
