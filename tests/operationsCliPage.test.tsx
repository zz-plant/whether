import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import OperationsCliPage from "../app/operations/cli/page";
import { operationsWorkstreamLinks } from "../lib/navigation/operationsNavigation";

describe("operations cli page", () => {
  it("renders command snippets and CLI API contract endpoints", () => {
    const html = renderToStaticMarkup(OperationsCliPage());

    assert.match(html, /Ship decision transmission from the terminal/);
    assert.match(html, /whether status/);
    assert.match(html, /whether call diff --from previous --to current/);
    assert.match(html, /whether changes/);
    assert.match(html, /whether history compare --weeks 6/);
    assert.match(html, /whether scenario --tightness 0.65 --risk-appetite 0.45/);
    assert.match(html, /whether status --json/);

    assert.match(html, /GET \/api\/cli\/status/);
    assert.match(html, /GET \/api\/cli\/call/);
    assert.match(html, /GET \/api\/cli\/changes/);
    assert.match(html, /GET \/api\/cli\/history/);
    assert.match(html, /GET \/api\/cli\/scenario/);
  });

  it("exposes a discoverable operations workstream link", () => {
    const cliLink = operationsWorkstreamLinks.find((link) => link.href === "/operations/cli");

    assert.ok(cliLink);
    assert.equal(cliLink?.label, "CLI");
    assert.match(cliLink?.description ?? "", /status, changes, history, and scenario/i);
  });
});
