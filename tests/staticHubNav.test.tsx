import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticHubNav } from "../app/components/staticHubNav";

describe("StaticHubNav", () => {
  it("shows the support-layer navigation with route cues", () => {
    const html = renderToStaticMarkup(
      <StaticHubNav currentPath="/signals" />,
    );

    assert.match(html, /Support layers/);
    assert.match(html, /Proof, planning, translation, and trust/);
    assert.match(html, /Current surface/);
    assert.match(html, /Evidence/);
    assert.match(html, /Route \/signals/);
    assert.match(html, /Workflow surface/);
  });
});
