import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticHubNav } from "../app/components/staticHubNav";

describe("StaticHubNav", () => {
  it("shows the five-surface operator loop with route cues", () => {
    const html = renderToStaticMarkup(
      <StaticHubNav currentPath="/signals" />,
    );

    assert.match(html, /Five-surface operator loop/);
    assert.match(html, /Move from the Weekly Brief to Evidence, Planning, Decision Tools, and Trust/);
    assert.match(html, /Current surface/);
    assert.match(html, /Surface 2 of 5/);
    assert.match(html, /Route \/signals/);
    assert.match(html, /Evidence/);
  });
});
