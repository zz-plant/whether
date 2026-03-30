import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NavigationOrientationBadge } from "../app/components/navigationOrientationBadge";

describe("NavigationOrientationBadge", () => {
  it("renders each zone as a link to its canonical landing route", () => {
    const html = renderToStaticMarkup(
      <NavigationOrientationBadge currentPath="/operations" />,
    );

    assert.match(html, /href="\/"[^>]*aria-label="Anchor"/);
    assert.match(html, /href="\/signals"[^>]*aria-label="Action"/);
    assert.match(html, /href="\/method"[^>]*aria-label="Verify"/);
    assert.match(html, /title="Weekly call and bounded actions for this week"/);
  });

  it("applies the active zone styling", () => {
    const html = renderToStaticMarkup(
      <NavigationOrientationBadge currentPath="/method" />,
    );

    assert.match(html, /href="\/method"[^>]*border-violet-300\/30 bg-violet-400\/10 text-violet-100/);
  });
});
