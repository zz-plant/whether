import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NavigationOrientationBadge } from "../app/components/navigationOrientationBadge";

describe("NavigationOrientationBadge", () => {
  it("renders each zone as a link to its canonical landing route", () => {
    const html = renderToStaticMarkup(
      <NavigationOrientationBadge currentPath="/operations" />,
    );

    assert.match(html, /href="\/"[^>]*aria-label="Now section"/);
    assert.match(html, /href="\/signals"[^>]*aria-label="Operate section"/);
    assert.match(html, /href="\/learn"[^>]*aria-label="Reference section"/);
    assert.match(html, /title="Decision call and bounded actions for this week"/);
  });

  it("marks the active zone", () => {
    const html = renderToStaticMarkup(
      <NavigationOrientationBadge currentPath="/method" />,
    );

    assert.match(html, /href="\/learn"[^>]*aria-current="true"/);
  });
});
